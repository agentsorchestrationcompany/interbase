export const EmptyBorder = {
  topLeft: "",
  bottomLeft: "",
  vertical: "",
  topRight: "",
  bottomRight: "",
  horizontal: " ",
  bottomT: "",
  topT: "",
  cross: "",
  leftT: "",
  rightT: "",
}

export const AsciiBorder = {
  topLeft: "+",
  bottomLeft: "+",
  vertical: "|",
  topRight: "+",
  bottomRight: "+",
  horizontal: "-",
  bottomT: "+",
  topT: "+",
  cross: "+",
  leftT: "+",
  rightT: "+",
}

export const AsciiBorderFrame = {
  border: ["top" as const, "right" as const, "bottom" as const, "left" as const],
  customBorderChars: AsciiBorder,
}

export const SplitBorder = {
  border: ["left" as const, "right" as const],
  customBorderChars: {
    ...EmptyBorder,
    vertical: "┃",
  },
}
