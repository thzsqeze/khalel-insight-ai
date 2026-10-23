export class ApiError extends Error { constructor(public readonly code:string,public readonly status=400){super(code);} }
