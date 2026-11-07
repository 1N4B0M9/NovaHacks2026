export class OrderError extends Error {
  constructor(
    public status: number,
    message: string,
    public draft?: unknown,
  ) {
    super(message);
  }
}
