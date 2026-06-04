declare module "qrcode-terminal" {
  const qrcode: {
    generate(input: string, options?: { small?: boolean }, callback?: (output: string) => void): void
  }

  export default qrcode
}
