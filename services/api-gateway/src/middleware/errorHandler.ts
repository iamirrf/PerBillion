import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import multer from 'multer';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error:', err);

  if (res.headersSent) return next(err);
  const status = err instanceof multer.MulterError ? (err.code === 'LIMIT_FILE_SIZE' ? 413 : 400) : err.status || 500;
  const message = status >= 500 && process.env.NODE_ENV !== 'development' ? 'Internal server error' : err.message || 'Internal server error';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
