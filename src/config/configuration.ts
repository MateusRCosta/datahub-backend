export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  development: process.env.NODE_ENV === 'development' ? false : true,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://development:development@127.0.0.1:31234/development',
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      'SENHASUPERSECRETAPARA UTILIZARNODESENVOLVIMENTO',
    expiresInAccessToken: parseInt(
      process.env.JWT_ACCESS_EXPIRES_IN || '300',
      10,
    ),
    expiresInRefreshToken: parseInt(
      process.env.JWT_REFRESH_EXPIRES_IN || '28800',
      10,
    ),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  argon: {
    memoryCost: parseInt(process.env.ARGON_MEMORY_COST || '19456', 10),
    timeCost: parseInt(process.env.ARGON_TIME_COST || '2', 10),
    parallelism: parseInt(process.env.ARGON_PARALLELISM || '1', 10),
    hashLength: parseInt(process.env.ARGON_HASH_LENGTH || '32', 10),
  },
});
