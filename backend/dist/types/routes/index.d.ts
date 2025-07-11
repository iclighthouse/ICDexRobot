import { Request, Response } from 'express';
import { NextFunction } from 'express-serve-static-core';
declare const router: import("express-serve-static-core").Router;
export declare const auth: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const sendEventToClients: (strategyId: number, message: string, type?: string | undefined) => void;
export default router;
