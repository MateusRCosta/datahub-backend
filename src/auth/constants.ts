import configuration from '../config/configuration';

const { jwt, development } = configuration();
export const jwtConstants = {
  secret: jwt.secret,
  development: development,
  expiresInAccessToken: jwt.expiresInAccessToken,
  expiresInRefreshToken: jwt.expiresInRefreshToken,
};
