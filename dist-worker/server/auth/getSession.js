"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSession = void 0;
const next_1 = require("next-auth/next");
const auth_1 = require("@/server/auth");
async function getSession() {
    return await (0, next_1.getServerSession)(auth_1.authOptions);
}
exports.getSession = getSession;
exports.default = getSession;
