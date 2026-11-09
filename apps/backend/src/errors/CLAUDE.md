# Error Conventions

- `AppError(message, statusCode)` is the base class — ALL custom errors MUST extend it
- NEVER throw raw `Error` — always use `AppError` or a subclass
- Available errors: `BadRequest` (400), `Unauthorized` (401), `Forbidden` (403), `NotFound` (404), `Conflict` (409), `UnprocessableEntity` (422)
- Error handler returns `ApiResponse` shape: `{ success, error, message }`
- To create a new error: extend `AppError` with a fixed `statusCode` and default message
- Services throw these errors — routes (controllers) catch and handle them
