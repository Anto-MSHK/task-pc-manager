import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponseBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    const responseBody = this.normalizeExceptionResponse(exceptionResponse);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: responseBody.message,
      error: responseBody.error,
    });
  }

  private normalizeExceptionResponse(exceptionResponse: string | object): ErrorResponseBody {
    if (typeof exceptionResponse === 'string') {
      return { message: exceptionResponse };
    }

    const body = exceptionResponse as ErrorResponseBody;
    return {
      message: body.message ?? 'Unexpected error',
      error: body.error,
    };
  }
}
