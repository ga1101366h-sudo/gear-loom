/**
 * 楽器メーカー・ブランド一覧（トップ「ブランドで選ぶ」用）
 */

export interface BrandGroup {
  id: string;
  titleJa: string;
  titleEn: string;
  brands: string[];
}

export const INSTRUMENT_MAKER_GROUPS: BrandGroup[] = [
  {
    id: "guitar-bass",
    titleJa: "ギター・ベース（Guitar & Bass）",
    titleEn: "Guitar & Bass",
    brands: [
      "Fender",
      "Gibson",
      "PRS (Paul Reed Smith)",
      "Ibanez (星野楽器)",
      "Rickenbacker",
      "Music Man",
      "G&L",
      "Gretsch",
      "ESP",
      "Sugi Guitars",
      "Momose / Bacchus (Deviser)",
      "FGN (Fujigen)",
      "Freedom Custom Guitar Research",
      "Dragonfly (Harry's Engineering)",
      "Crews Maniac Sound",
      "Psychederhythm",
      "Saitias Guitars",
      "Suhr",
      "Tom Anderson",
      "James Tyler",
      "Mayones",
      "Strandberg",
      "Sadowsky",
    ],
  },
  {
    id: "amps-effects",
    titleJa: "アンプ・エフェクター（Amps & Effects）",
    titleEn: "Amps & Effects",
    brands: [
      "Marshall",
      "Vox",
      "Orange",
      "Mesa/Boogie",
      "Fender",
      "Roland",
      "Kemper",
      "Neural DSP",
      "BOSS",
      "MXR",
      "Electro-Harmonix",
      "TC Electronic",
      "Digitech",
      "Strymon",
      "Eventide",
      "JHS Pedals",
      "EarthQuaker Devices",
      "Chase Bliss",
      "Vemuram",
      "Free The Tone",
    ],
  },
  {
    id: "drums",
    titleJa: "ドラム・打楽器（Drums）",
    titleEn: "Drums",
    brands: [
      "Pearl",
      "TAMA",
      "Yamaha",
      "Canopus",
      "Sakae Osaka Heritage",
      "DW (Drum Workshop)",
      "Ludwig",
      "Gretsch",
      "Sonor",
      "Mapex",
      "Zildjian",
      "Sabian",
      "Paiste",
      "Meinl",
    ],
  },
  {
    id: "keyboards-synths",
    titleJa: "鍵盤・シンセサイザー（Keyboards & Synths）",
    titleEn: "Keyboards & Synths",
    brands: [
      "Roland",
      "Korg",
      "Yamaha",
      "Nord (Clavia)",
      "Moog",
      "Sequential",
      "Arturia",
      "Teenage Engineering",
    ],
  },
];
