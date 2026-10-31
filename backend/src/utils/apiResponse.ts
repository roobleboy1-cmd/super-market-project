import { Response } from 'express';
import { ApiResponse } from '../types/common';

export class Send {
  static success<T>(
    res: Response,
    data: T,
    meta?: ApiResponse['meta'],
    statusCode = 200
  ): Response {
    const payload: ApiResponse<T> = {
      success: true,
      data,
      ...(meta ? { meta } : {})
    };
    return res.status(statusCode).json(payload);
  }

  static created<T>(res: Response, data: T, meta?: ApiResponse['meta']): Response {
    return Send.success(res, data, meta, 201);
  }

  static error(
    res: Response,
    message: string,
    code = 'ERROR',
    statusCode = 400,
    details?: any
  ): Response {
    const payload: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {})
      }
    };
    return res.status(statusCode).json(payload);
  }
}
