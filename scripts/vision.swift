// rf-vision: Apple Vision helpers for Reel Maker (macOS 12+).
//   rf-vision matte <video> <w> <h>   -> raw 8-bit gray person masks, one per frame, on stdout
//   rf-vision faces <video> <step>    -> JSON face boxes (top-left origin, 0..1) + capture quality every <step> s
import AVFoundation
import CoreImage
import Foundation
import Vision

func fail(_ msg: String) -> Never {
    FileHandle.standardError.write((msg + "\n").data(using: .utf8)!)
    exit(1)
}

let args = CommandLine.arguments
guard args.count >= 4 else { fail("usage: rf-vision matte <video> <w> <h> | faces <video> <step>") }
let asset = AVURLAsset(url: URL(fileURLWithPath: args[2]))
guard let track = asset.tracks(withMediaType: .video).first else { fail("no video track") }
guard let reader = try? AVAssetReader(asset: asset) else { fail("cannot read video") }
let output = AVAssetReaderTrackOutput(track: track, outputSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
])
output.alwaysCopiesSampleData = false
reader.add(output)
reader.startReading()
let ctx = CIContext(options: [.workingColorSpace: NSNull()])

switch args[1] {
case "matte":
    guard args.count >= 5, let w = Int(args[3]), let h = Int(args[4]) else { fail("matte needs <w> <h>") }
    let req = VNGeneratePersonSegmentationRequest()
    req.qualityLevel = .balanced
    req.outputPixelFormat = kCVPixelFormatType_OneComponent8
    var bytes = [UInt8](repeating: 0, count: w * h)
    var rgba = [UInt8](repeating: 0, count: w * h * 4)
    var idx = 0, pending: Data? = nil, pendingT = 0.0
    let fps = Double(track.nominalFrameRate > 0 ? track.nominalFrameRate : 30)
    let out = FileHandle.standardOutput
    while let sample = output.copyNextSampleBuffer() {
        guard let pb = CMSampleBufferGetImageBuffer(sample) else { continue }
        var frame = Data(count: w * h)
        try? VNImageRequestHandler(cvPixelBuffer: pb, options: [:]).perform([req])
        if let mask = req.results?.first?.pixelBuffer {
            let img = CIImage(cvPixelBuffer: mask)
            let sx = CGFloat(w) / img.extent.width, sy = CGFloat(h) / img.extent.height
            let scaled = img.transformed(by: CGAffineTransform(scaleX: sx, y: sy))
            // RGBA8 is the reliably supported bitmap format; keep the red channel as the mask
            rgba.withUnsafeMutableBytes { buf in
                ctx.render(scaled, toBitmap: buf.baseAddress!, rowBytes: w * 4,
                           bounds: CGRect(x: 0, y: 0, width: w, height: h), format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
            }
            for i in 0..<(w * h) { bytes[i] = rgba[i * 4] }
            frame = Data(bytes)
        }
        // AVAssetReader emits a phantom frame at t=0 when the stream starts slightly later (AAC
        // priming offset after concat); ffmpeg does not count it, so drop frame 0 if frame 1 is < 1 frame later
        let t = CMSampleBufferGetPresentationTimeStamp(sample).seconds
        if let p = pending, !(idx == 1 && t - pendingT < 0.9 / fps) { out.write(p) }
        pending = frame
        pendingT = t
        idx += 1
    }
    if let p = pending { out.write(p) }
case "faces":
    let step = Double(args[3]) ?? 0.5
    var next = 0.0
    var rows: [[String: Any]] = []
    while let sample = output.copyNextSampleBuffer() {
        let t = CMSampleBufferGetPresentationTimeStamp(sample).seconds
        if t + 1e-6 < next { continue }
        next = t + step
        guard let pb = CMSampleBufferGetImageBuffer(sample) else { continue }
        let req = VNDetectFaceCaptureQualityRequest()
        try? VNImageRequestHandler(cvPixelBuffer: pb, options: [:]).perform([req])
        let faces: [[String: Double]] = (req.results ?? []).map { f in
            let b = f.boundingBox
            return ["x": b.minX, "y": 1 - b.maxY, "w": b.width, "h": b.height,
                    "q": Double(f.faceCaptureQuality ?? 0)]
        }
        rows.append(["t": (t * 1000).rounded() / 1000, "faces": faces])
    }
    let data = try! JSONSerialization.data(withJSONObject: ["step": step, "frames": rows], options: [])
    FileHandle.standardOutput.write(data)
default:
    fail("unknown mode \(args[1])")
}
if reader.status == .failed { fail("read failed: \(reader.error?.localizedDescription ?? "?")") }
