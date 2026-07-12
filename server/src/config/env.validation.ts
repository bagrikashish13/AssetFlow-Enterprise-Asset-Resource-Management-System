import Joi from 'joi';

/**
 * Environment schema validated at boot. Missing or malformed configuration
 * fails fast before the application starts accepting traffic.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('8h'),
  CLIENT_ORIGIN: Joi.string().uri().required(),
  UPLOAD_DIR: Joi.string().default('uploads'),
  MAX_UPLOAD_MB: Joi.number().positive().default(5),
  THROTTLE_TTL: Joi.number().positive().default(60),
  THROTTLE_LIMIT: Joi.number().positive().default(100),
});
