"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const settlementWorker_1 = require("./settlementWorker");
console.log('[settlementWorkerEntry] Booting worker...');
(0, settlementWorker_1.startSettlementWorker)();
