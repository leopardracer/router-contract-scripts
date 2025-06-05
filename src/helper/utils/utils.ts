export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function unimplemented() {
  throw new Error("unimplemented");
}
