import {loadFont as anton} from "@remotion/google-fonts/Anton";
import {loadFont as baloo} from "@remotion/google-fonts/Baloo2";
import {loadFont as bangers} from "@remotion/google-fonts/Bangers";
import {loadFont as bebas} from "@remotion/google-fonts/BebasNeue";
import {loadFont as caveat} from "@remotion/google-fonts/Caveat";
import {loadFont as dmSerif} from "@remotion/google-fonts/DMSerifDisplay";
import {loadFont as inter} from "@remotion/google-fonts/Inter";
import {loadFont as mono} from "@remotion/google-fonts/JetBrainsMono";
import {loadFont as montserrat} from "@remotion/google-fonts/Montserrat";
import {loadFont as poppins} from "@remotion/google-fonts/Poppins";
import {loadFont as grotesk} from "@remotion/google-fonts/SpaceGrotesk";

// Poppins and Baloo 2 carry Devanagari, so Hindi captions work in the default looks.
export const F = {
  poppins: poppins("normal", {weights: ["500", "700", "800", "900"], subsets: ["latin", "devanagari"]}).fontFamily,
  baloo: baloo("normal", {weights: ["600", "800"], subsets: ["latin", "devanagari"]}).fontFamily,
  inter: inter("normal", {weights: ["400", "600", "800"], subsets: ["latin"]}).fontFamily,
  montserrat: montserrat("normal", {weights: ["800", "900"], subsets: ["latin"]}).fontFamily,
  anton: anton("normal", {weights: ["400"], subsets: ["latin"]}).fontFamily,
  bebas: bebas("normal", {weights: ["400"], subsets: ["latin"]}).fontFamily,
  bangers: bangers("normal", {weights: ["400"], subsets: ["latin"]}).fontFamily,
  dmSerif: dmSerif("normal", {weights: ["400"], subsets: ["latin"]}).fontFamily,
  grotesk: grotesk("normal", {weights: ["500", "700"], subsets: ["latin"]}).fontFamily,
  mono: mono("normal", {weights: ["500", "700"], subsets: ["latin"]}).fontFamily,
  caveat: caveat("normal", {weights: ["700"], subsets: ["latin"]}).fontFamily,
};
