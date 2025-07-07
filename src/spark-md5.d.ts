declare module 'spark-md5' {
  const SparkMD5: {
    hash(str: string): string
    hashBinary(str: string): string
    ArrayBuffer: {
      hash(buf: ArrayBuffer): string
    }
  }
  export default SparkMD5
}
