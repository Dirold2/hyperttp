"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestProfiler = void 0;
function toMemorySnapshot() {
    const usage = process.memoryUsage();
    return {
        rss: usage.rss,
        heapTotal: usage.heapTotal,
        heapUsed: usage.heapUsed,
        external: usage.external,
        arrayBuffers: usage.arrayBuffers,
    };
}
class RequestProfiler {
    static async profile(executor) {
        const startedAt = Date.now();
        const hrStart = process.hrtime.bigint();
        const cpuStart = process.cpuUsage();
        const memoryBefore = toMemorySnapshot();
        const result = await executor();
        const hrEnd = process.hrtime.bigint();
        const finishedAt = Date.now();
        const cpuDiff = process.cpuUsage(cpuStart);
        const memoryAfter = toMemorySnapshot();
        const durationMs = Number(hrEnd - hrStart) / 1_000_000;
        const cpuUserMs = cpuDiff.user / 1000;
        const cpuSystemMs = cpuDiff.system / 1000;
        const cpuTotalMs = cpuUserMs + cpuSystemMs;
        const profile = {
            wallClockStart: startedAt,
            wallClockEnd: finishedAt,
            durationMs,
            cpu: {
                userMs: cpuUserMs,
                systemMs: cpuSystemMs,
                totalMs: cpuTotalMs,
                percent: durationMs > 0 ? (cpuTotalMs / durationMs) * 100 : 0,
            },
            memory: {
                before: memoryBefore,
                after: memoryAfter,
                delta: {
                    rss: memoryAfter.rss - memoryBefore.rss,
                    heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
                    heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
                    external: memoryAfter.external - memoryBefore.external,
                    arrayBuffers: memoryAfter.arrayBuffers - memoryBefore.arrayBuffers,
                },
            },
        };
        return { result, profile };
    }
}
exports.RequestProfiler = RequestProfiler;
//# sourceMappingURL=RequestProfiler.js.map