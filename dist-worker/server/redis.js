"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatesChannel = exports.snapshotKey = exports.redisSub = exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
    throw new Error('REDIS_URL is required');
}
exports.redis = new ioredis_1.default(REDIS_URL);
exports.redisSub = new ioredis_1.default(REDIS_URL);
function snapshotKey(marketId) {
    return `market:${marketId}`;
}
exports.snapshotKey = snapshotKey;
function updatesChannel(marketId) {
    return `market:${marketId}:updates`;
}
exports.updatesChannel = updatesChannel;
