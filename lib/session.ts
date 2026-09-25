import { createHmac, timingSafeEqual } from "node:crypto";

export type InstanceCredentials = {
  idInstance: string;
  apiTokenInstance: string;
};

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error("JWT_SECRET is not set");
  }
  return value;
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

export function signSession(credentials: InstanceCredentials) {
  const header = encode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encode(JSON.stringify(credentials));
  const data = `${header}.${payload}`;
  const signature = createHmac("sha256", secret()).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function verifySession(token: string): InstanceCredentials | null {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) {
    return null;
  }

  const data = `${header}.${payload}`;
  const expected = createHmac("sha256", secret()).update(data).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as Partial<InstanceCredentials>;
    if (!parsed.idInstance || !parsed.apiTokenInstance) {
      return null;
    }
    return {
      idInstance: parsed.idInstance,
      apiTokenInstance: parsed.apiTokenInstance,
    };
  } catch {
    return null;
  }
}
