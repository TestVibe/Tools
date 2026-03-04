//#PackageDescription=AWS S3 provider tools for storing and retrieving Playwright artifacts and fixtures.
//#PackageVersion=1.0.0
//#Variables=AWS_REGION,AWS_S3_BUCKET,AWS_S3_ENDPOINT,AWS_S3_FORCE_PATH_STYLE
//#Secrets=AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_SESSION_TOKEN
//#Example=Upload a Playwright trace: { key: "runs/123/trace.zip", contentBase64: "<base64>", contentType: "application/zip" }.
//#Example=Create a presigned download URL for a screenshot: { key: "runs/123/home.png", expiresIn: 1800 }.

const crypto = require("crypto");

//#Summary=Upload S3 artifact
//#Description=Uploads test artifacts or fixture content to an S3 bucket using PutObject.
//#ReturnsType=object
//#ReturnsValue={"bucket":"qa-artifacts","key":"runs/123/trace.zip","eTag":"\"abc123\"","versionId":"3Lg...","contentType":"application/zip","sizeBytes":2048}
async function uploadArtifact(pageOrInput, inputMaybe) {
  const {
    bucket,
    key,
    content,
    contentBase64,
    contentType,
    cacheControl,
    metadata
  } = normalizeArgs(pageOrInput, inputMaybe, [
    "bucket",
    "key",
    "content",
    "contentBase64",
    "contentType",
    "cacheControl",
    "metadata"
  ]);

  const resolvedBucket = resolveBucket(bucket);
  if (!key) {
    throw new Error("Missing required parameter: key");
  }
  if (content === undefined && !contentBase64) {
    throw new Error("Provide content or contentBase64.");
  }

  const body = buildUploadBody(content, contentBase64);
  try {
    const response = await sendSignedS3Request({
      method: "PUT",
      bucket: resolvedBucket,
      key: String(key),
      body,
      headers: {
        ...(contentType ? { "content-type": String(contentType) } : {}),
        ...(cacheControl ? { "cache-control": String(cacheControl) } : {}),
        ...buildMetadataHeaders(normalizeMetadata(metadata))
      }
    });

    const eTag = response.headers.get("etag");
    const versionId = response.headers.get("x-amz-version-id");
    const requestId = response.headers.get("x-amz-request-id");

    return {
      bucket: resolvedBucket,
      key: String(key),
      eTag: eTag || null,
      versionId: versionId || null,
      requestId: requestId || null,
      contentType: contentType ? String(contentType) : null,
      sizeBytes: getBodySize(body)
    };
  } catch (error) {
    throw formatS3Error("PutObject", error, true);
  }
}

//#Summary=Download S3 fixture
//#Description=Downloads content from S3 and returns it as base64, UTF-8 text, or parsed JSON.
//#ReturnsType=object
//#ReturnsValue={"bucket":"qa-artifacts","key":"fixtures/user.json","encoding":"json","content":{"name":"Alice"}}
async function downloadFixture(pageOrInput, inputMaybe) {
  const {
    bucket,
    key,
    encoding
  } = normalizeArgs(pageOrInput, inputMaybe, ["bucket", "key", "encoding"]);

  const resolvedBucket = resolveBucket(bucket);
  if (!key) {
    throw new Error("Missing required parameter: key");
  }

  const resolvedEncoding = normalizeEncoding(encoding);
  try {
    const response = await sendSignedS3Request({
      method: "GET",
      bucket: resolvedBucket,
      key: String(key)
    });
    const data = Buffer.from(await response.arrayBuffer());
    const lm = response.headers.get("last-modified");
    return {
      bucket: resolvedBucket,
      key: String(key),
      encoding: resolvedEncoding,
      content: decodeBuffer(data, resolvedEncoding),
      contentType: response.headers.get("content-type") || null,
      contentLength: toNumberOrNull(response.headers.get("content-length")) || data.length,
      eTag: response.headers.get("etag") || null,
      lastModified: lm ? new Date(lm).toISOString() : null
    };
  } catch (error) {
    throw formatS3Error("GetObject", error, true);
  }
}

//#Summary=Create presigned S3 upload URL
//#Description=Creates a time-limited presigned PUT URL for uploading an object directly to S3.
//#ReturnsType=object
//#ReturnsValue={"bucket":"qa-artifacts","key":"runs/123/video.webm","url":"https://...","method":"PUT","expiresIn":900}
async function createPresignedUploadUrl(pageOrInput, inputMaybe) {
  const {
    bucket,
    key,
    expiresIn,
    contentType
  } = normalizeArgs(pageOrInput, inputMaybe, ["bucket", "key", "expiresIn", "contentType"]);

  const resolvedBucket = resolveBucket(bucket);
  if (!key) {
    throw new Error("Missing required parameter: key");
  }

  const ttl = normalizeExpiresIn(expiresIn);
  try {
    const url = buildPresignedUrl({
      method: "PUT",
      bucket: resolvedBucket,
      key: String(key),
      expiresIn: ttl,
      extraHeaders: contentType ? { "content-type": String(contentType) } : {}
    });
    return {
      bucket: resolvedBucket,
      key: String(key),
      url,
      method: "PUT",
      expiresIn: ttl
    };
  } catch (error) {
    throw formatS3Error("PresignPutObject", error, false);
  }
}

//#Summary=Create presigned S3 download URL
//#Description=Creates a time-limited presigned GET URL for downloading an object from S3.
//#ReturnsType=object
//#ReturnsValue={"bucket":"qa-artifacts","key":"runs/123/trace.zip","url":"https://...","method":"GET","expiresIn":900}
async function createPresignedDownloadUrl(pageOrInput, inputMaybe) {
  const {
    bucket,
    key,
    expiresIn
  } = normalizeArgs(pageOrInput, inputMaybe, ["bucket", "key", "expiresIn"]);

  const resolvedBucket = resolveBucket(bucket);
  if (!key) {
    throw new Error("Missing required parameter: key");
  }

  const ttl = normalizeExpiresIn(expiresIn);
  try {
    const url = buildPresignedUrl({
      method: "GET",
      bucket: resolvedBucket,
      key: String(key),
      expiresIn: ttl
    });
    return {
      bucket: resolvedBucket,
      key: String(key),
      url,
      method: "GET",
      expiresIn: ttl
    };
  } catch (error) {
    throw formatS3Error("PresignGetObject", error, false);
  }
}

//#Summary=Delete S3 object
//#Description=Deletes an object from S3 by key and optional version ID.
//#ReturnsType=object
//#ReturnsValue={"bucket":"qa-artifacts","key":"runs/123/trace.zip","deleted":true}
async function deleteObject(pageOrInput, inputMaybe) {
  const {
    bucket,
    key,
    versionId
  } = normalizeArgs(pageOrInput, inputMaybe, ["bucket", "key", "versionId"]);

  const resolvedBucket = resolveBucket(bucket);
  if (!key) {
    throw new Error("Missing required parameter: key");
  }

  try {
    const response = await sendSignedS3Request({
      method: "DELETE",
      bucket: resolvedBucket,
      key: String(key),
      query: versionId ? { versionId: String(versionId) } : {}
    });
    return {
      bucket: resolvedBucket,
      key: String(key),
      deleted: true,
      versionId: versionId ? String(versionId) : null,
      requestId: response.headers.get("x-amz-request-id") || null
    };
  } catch (error) {
    throw formatS3Error("DeleteObject", error, true);
  }
}

//#Summary=List S3 artifacts
//#Description=Lists objects in an S3 bucket, with optional prefix filtering and pagination.
//#ReturnsType=object
//#ReturnsValue={"bucket":"qa-artifacts","prefix":"runs/123/","items":[{"key":"runs/123/trace.zip","size":2048}],"isTruncated":false}
async function listRunArtifacts(pageOrInput, inputMaybe) {
  const {
    bucket,
    prefix,
    maxKeys,
    continuationToken,
    startAfter
  } = normalizeArgs(pageOrInput, inputMaybe, [
    "bucket",
    "prefix",
    "maxKeys",
    "continuationToken",
    "startAfter"
  ]);

  const resolvedBucket = resolveBucket(bucket);
  try {
    const query = {
      "list-type": "2",
      ...(prefix ? { prefix: String(prefix) } : {}),
      ...(continuationToken ? { "continuation-token": String(continuationToken) } : {}),
      ...(startAfter ? { "start-after": String(startAfter) } : {}),
      "max-keys": String(normalizeMaxKeys(maxKeys))
    };
    const response = await sendSignedS3Request({
      method: "GET",
      bucket: resolvedBucket,
      query
    });
    const xml = await response.text();
    const parsed = parseListObjectsV2Xml(xml);

    return {
      bucket: resolvedBucket,
      prefix: prefix ? String(prefix) : "",
      items: parsed.items,
      keyCount: parsed.keyCount,
      isTruncated: parsed.isTruncated,
      nextContinuationToken: parsed.nextContinuationToken
    };
  } catch (error) {
    throw formatS3Error("ListObjectsV2", error, true);
  }
}

function looksLikePage(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.goto === "function" &&
    typeof value.url === "function"
  );
}

function pickArgs(source, keys) {
  const target = {};
  for (const key of keys) {
    target[key] = source ? source[key] : undefined;
  }
  return target;
}

function normalizeArgs(pageOrInput, inputMaybe, keys) {
  if (looksLikePage(pageOrInput)) {
    if (inputMaybe && typeof inputMaybe === "object" && !Array.isArray(inputMaybe)) {
      return inputMaybe;
    }
    return pickArgs(pageOrInput, keys);
  }

  if (pageOrInput && typeof pageOrInput === "object" && !Array.isArray(pageOrInput)) {
    return pageOrInput;
  }

  return {};
}

function resolveBucket(bucket) {
  const resolved = bucket || process.env.AWS_S3_BUCKET;
  if (!resolved) {
    throw new Error("Missing required parameter/environment: bucket or AWS_S3_BUCKET");
  }
  return String(resolved);
}

function getAwsConfig() {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;
  if (!region) throw new Error("Missing environment variable: AWS_REGION");
  if (!accessKeyId) throw new Error("Missing environment variable: AWS_ACCESS_KEY_ID");
  if (!secretAccessKey) throw new Error("Missing environment variable: AWS_SECRET_ACCESS_KEY");
  return {
    region: String(region),
    accessKeyId: String(accessKeyId),
    secretAccessKey: String(secretAccessKey),
    sessionToken: sessionToken ? String(sessionToken) : null
  };
}

function getEndpointConfig(bucket) {
  const endpointRaw = process.env.AWS_S3_ENDPOINT || "";
  const configuredPathStyle = parseBoolean(process.env.AWS_S3_FORCE_PATH_STYLE);
  const endpoint = endpointRaw
    ? new URL(endpointRaw)
    : new URL(`https://s3.${process.env.AWS_REGION}.amazonaws.com`);
  const protocol = endpoint.protocol || "https:";
  const baseHost = endpoint.host;
  const usePathStyle = configuredPathStyle !== null
    ? configuredPathStyle
    : Boolean(endpointRaw) || (protocol === "https:" && String(bucket).includes("."));

  const host = usePathStyle ? baseHost : `${bucket}.${baseHost}`;
  const basePath = (endpoint.pathname || "/").replace(/\/+$/, "");
  return { protocol, host, basePath, usePathStyle };
}

function buildCanonicalUri(basePath, bucket, key, usePathStyle) {
  const parts = [];
  const cleanBase = basePath && basePath !== "/" ? basePath.replace(/^\/+/, "") : "";
  if (cleanBase) parts.push(...cleanBase.split("/").filter(Boolean));
  if (usePathStyle) parts.push(String(bucket));
  if (key) parts.push(...String(key).split("/").filter((v) => v.length > 0));
  return "/" + parts.map(encodeRfc3986).join("/");
}

async function sendSignedS3Request({ method, bucket, key, query, headers, body }) {
  const aws = getAwsConfig();
  const endpoint = getEndpointConfig(bucket);
  const canonicalUri = buildCanonicalUri(endpoint.basePath, bucket, key, endpoint.usePathStyle);
  const payloadBuffer = bodyToBuffer(body);
  const payloadHash = sha256Hex(payloadBuffer);
  const url = `${endpoint.protocol}//${endpoint.host}${canonicalUri}${toUrlQueryString(query || {})}`;

  const { authorization, amzDate, securityToken, signedHeaders } = createAuthorization({
    method,
    host: endpoint.host,
    canonicalUri,
    query: query || {},
    extraHeaders: headers || {},
    payloadHash,
    aws
  });

  const requestHeaders = {
    host: endpoint.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    authorization,
    ...normalizeHeaderValues(headers || {})
  };
  if (securityToken) requestHeaders["x-amz-security-token"] = securityToken;

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: method === "GET" || method === "HEAD" ? undefined : payloadBuffer
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw createHttpError({
      operation: method,
      status: response.status,
      statusText: response.statusText,
      bodyText: responseText,
      requestId: response.headers.get("x-amz-request-id"),
      signedHeaders
    });
  }

  return response;
}

function createAuthorization({ method, host, canonicalUri, query, extraHeaders, payloadHash, aws }) {
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = toDateStamp(now);
  const credentialScope = `${dateStamp}/${aws.region}/s3/aws4_request`;
  const headers = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...normalizeHeaderValues(extraHeaders || {})
  };
  if (aws.sessionToken) headers["x-amz-security-token"] = aws.sessionToken;

  const canonicalHeaders = toCanonicalHeaders(headers);
  const signedHeaders = canonicalHeaders.signedHeaders;
  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    toCanonicalQueryString(query || {}),
    canonicalHeaders.canonical,
    signedHeaders,
    payloadHash
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");

  const signature = hmacHex(
    getSignatureKey(aws.secretAccessKey, dateStamp, aws.region, "s3"),
    stringToSign
  );

  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${aws.accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`
  ].join(", ");

  return {
    authorization,
    amzDate,
    securityToken: aws.sessionToken,
    signedHeaders
  };
}

function buildPresignedUrl({ method, bucket, key, expiresIn, extraHeaders }) {
  const aws = getAwsConfig();
  const endpoint = getEndpointConfig(bucket);
  const canonicalUri = buildCanonicalUri(endpoint.basePath, bucket, key, endpoint.usePathStyle);
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = toDateStamp(now);
  const credentialScope = `${dateStamp}/${aws.region}/s3/aws4_request`;
  const normalizedHeaders = {
    host: endpoint.host,
    ...normalizeHeaderValues(extraHeaders || {})
  };
  const canonicalHeaders = toCanonicalHeaders(normalizedHeaders);
  const signedHeaders = canonicalHeaders.signedHeaders;

  const query = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${aws.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": signedHeaders,
    ...(aws.sessionToken ? { "X-Amz-Security-Token": aws.sessionToken } : {})
  };

  const canonicalQuery = toCanonicalQueryString(query);
  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    canonicalQuery,
    canonicalHeaders.canonical,
    signedHeaders,
    "UNSIGNED-PAYLOAD"
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");
  const signature = hmacHex(
    getSignatureKey(aws.secretAccessKey, dateStamp, aws.region, "s3"),
    stringToSign
  );

  return `${endpoint.protocol}//${endpoint.host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

function parseBoolean(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") return true;
  if (normalized === "0" || normalized === "false" || normalized === "no") return false;
  throw new Error("Invalid AWS_S3_FORCE_PATH_STYLE value. Use true/false.");
}

function buildMetadataHeaders(metadata) {
  if (!metadata) return {};
  const headers = {};
  for (const [key, value] of Object.entries(metadata)) {
    headers[`x-amz-meta-${String(key).toLowerCase()}`] = String(value);
  }
  return headers;
}

function buildUploadBody(content, contentBase64) {
  if (contentBase64) {
    return Buffer.from(String(contentBase64), "base64");
  }

  if (Buffer.isBuffer(content)) {
    return content;
  }

  if (typeof content === "string") {
    return content;
  }

  if (content === undefined || content === null) {
    return "";
  }

  return JSON.stringify(content);
}

function getBodySize(body) {
  if (Buffer.isBuffer(body)) return body.length;
  if (typeof body === "string") return Buffer.byteLength(body, "utf8");
  return null;
}

function normalizeMetadata(metadata) {
  if (!metadata) return undefined;
  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error("metadata must be an object with string values.");
  }

  const output = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || value === null) continue;
    output[String(key)] = String(value);
  }
  return output;
}

function normalizeExpiresIn(value) {
  if (value === undefined || value === null || value === "") {
    return 900;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("expiresIn must be a positive number of seconds.");
  }
  return Math.floor(n);
}

function normalizeMaxKeys(value) {
  if (value === undefined || value === null || value === "") {
    return 1000;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 1000) {
    throw new Error("maxKeys must be a number between 1 and 1000.");
  }
  return Math.floor(n);
}

function normalizeEncoding(encoding) {
  const value = (encoding || "base64").toString().toLowerCase();
  if (value !== "base64" && value !== "utf8" && value !== "json") {
    throw new Error("encoding must be one of: base64, utf8, json");
  }
  return value;
}

function bodyToBuffer(body) {
  if (body === undefined || body === null) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === "string") return Buffer.from(body, "utf8");
  if (body instanceof Uint8Array) return Buffer.from(body);
  throw new Error("Unsupported upload body type. Use string, Buffer, or base64.");
}

function decodeBuffer(buffer, encoding) {
  if (encoding === "base64") {
    return buffer.toString("base64");
  }

  const text = buffer.toString("utf8");
  if (encoding === "utf8") {
    return text;
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch (error) {
    throw new Error(`Failed to parse JSON fixture content: ${error.message}`);
  }
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function hmac(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function hmacHex(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

function getSignatureKey(secretAccessKey, dateStamp, region, service) {
  const kDate = hmac(Buffer.from(`AWS4${secretAccessKey}`, "utf8"), dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function toAmzDate(date) {
  const iso = date.toISOString();
  return iso.replace(/[:-]|\.\d{3}/g, "");
}

function toDateStamp(date) {
  return toAmzDate(date).slice(0, 8);
}

function toCanonicalHeaders(headers) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || value === null) continue;
    const k = String(key).toLowerCase().trim();
    const v = String(value).trim().replace(/\s+/g, " ");
    normalized[k] = v;
  }
  const keys = Object.keys(normalized).sort();
  const canonical = keys.map((k) => `${k}:${normalized[k]}`).join("\n") + "\n";
  const signedHeaders = keys.join(";");
  return { canonical, signedHeaders };
}

function toCanonicalQueryString(query) {
  const pairs = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        pairs.push([String(key), String(item)]);
      }
    } else {
      pairs.push([String(key), String(value)]);
    }
  }
  pairs.sort((a, b) => {
    if (a[0] === b[0]) return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0;
    return a[0] < b[0] ? -1 : 1;
  });
  return pairs.map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`).join("&");
}

function toUrlQueryString(query) {
  const canonical = toCanonicalQueryString(query);
  return canonical ? `?${canonical}` : "";
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
}

function normalizeHeaderValues(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    if (v === undefined || v === null) continue;
    out[String(k).toLowerCase()] = String(v);
  }
  return out;
}

function createHttpError({ operation, status, statusText, bodyText, requestId }) {
  const parsed = parseS3ErrorXml(bodyText || "");
  const message = parsed.message || statusText || "Unknown error";
  const code = parsed.code || null;
  const suffix = [requestId ? `requestId=${requestId}` : null, code ? `code=${code}` : null]
    .filter(Boolean)
    .join(", ");
  const detail = truncate(String(bodyText || ""), 400);
  return new Error(
    `S3 ${operation} failed (status=${status}${suffix ? `, ${suffix}` : ""}): ${message}${detail ? `; body=${detail}` : ""}`
  );
}

function parseS3ErrorXml(xml) {
  if (!xml) return {};
  return {
    code: firstXmlTag(xml, "Code"),
    message: firstXmlTag(xml, "Message")
  };
}

function parseListObjectsV2Xml(xml) {
  const blocks = allXmlTagBodies(xml, "Contents");
  const items = blocks.map((block) => ({
    key: firstXmlTag(block, "Key") || "",
    size: toNumberOrNull(firstXmlTag(block, "Size")),
    eTag: firstXmlTag(block, "ETag") || null,
    lastModified: firstXmlTag(block, "LastModified") || null
  }));
  return {
    items,
    keyCount: toNumberOrNull(firstXmlTag(xml, "KeyCount")) || items.length,
    isTruncated: (firstXmlTag(xml, "IsTruncated") || "").toLowerCase() === "true",
    nextContinuationToken: firstXmlTag(xml, "NextContinuationToken") || null
  };
}

function firstXmlTag(xml, name) {
  const regex = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i");
  const match = regex.exec(xml);
  if (!match) return null;
  return decodeXml(match[1].trim());
}

function allXmlTagBodies(xml, name) {
  const regex = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "gi");
  const out = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    out.push(match[1]);
  }
  return out;
}

function decodeXml(value) {
  return String(value)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function formatS3Error(operation, error, includeHttpFields) {
  const message = error && error.message ? error.message : "Unknown error";
  if (!includeHttpFields) return new Error(`S3 ${operation} failed: ${message}`);
  return new Error(`S3 ${operation} failed: ${message}`);
}

module.exports = {
  uploadArtifact,
  downloadFixture,
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
  deleteObject,
  listRunArtifacts
};
