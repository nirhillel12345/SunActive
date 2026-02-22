const BASE_FALLBACK = process.env.POLY_REST_URL || 'https://gamma-api.polymarket.com';
export async function fetchMarkets() {
    const url = new URL('/events', BASE_FALLBACK);
    // פילטרים ראשוניים בבקשה ל-API
    url.searchParams.set('active', 'true');
    url.searchParams.set('closed', 'false');
    url.searchParams.set('include_markets', 'true');
    url.searchParams.set('limit', '100');
    url.searchParams.set('order', 'volume');
    url.searchParams.set('ascending', 'false');
    try {
        const res = await fetch(url.toString(), { cache: 'no-store' });
        if (!res.ok)
            throw new Error(`Polymarket API error: ${res.status}`);
        const json = await res.json();
        if (!Array.isArray(json))
            return [];
        const allSpecificMarkets = json.flatMap((event) => {
            // 1. סינון ברמת ה-Event
            if (!event.active || event.closed)
                return [];
            if (!event.markets || !Array.isArray(event.markets))
                return [];
            return event.markets.flatMap((m) => {
                // 2. סינון ברמת ה-Market הספציפי
                if (!m.active || m.closed === true)
                    return [];
                // 3. בדיקה שמדובר ב-Yes/No (בדיוק 2 תוצאות)
                let outcomeNames = [];
                try {
                    outcomeNames = typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : m.outcomes;
                }
                catch (e) {
                    outcomeNames = m.outcomeNames || [];
                }
                if (outcomeNames.length !== 2)
                    return [];
                // --- חילוץ CLOB Token IDs (Yes/No) ---
                let tokenYesId = null;
                let tokenNoId = null;
                try {
                    const clobTokens = typeof m.clobTokenIds === 'string' ? JSON.parse(m.clobTokenIds) : m.clobTokenIds;
                    if (Array.isArray(clobTokens) && clobTokens.length === 2) {
                        tokenYesId = String(clobTokens[0]); // הראשון הוא Yes
                        tokenNoId = String(clobTokens[1]); // השני הוא No
                    }
                }
                catch (e) {
                    console.error(`Failed to parse clobTokenIds for market ${m.id}`);
                }
                // 4. חישוב הסיכוי (Probability)
                let rawPrice = null;
                if (m.lastTradePrice && Number(m.lastTradePrice) > 0) {
                    rawPrice = Number(m.lastTradePrice);
                }
                else {
                    let outcomePrices = [];
                    try {
                        outcomePrices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
                        if (outcomePrices?.[0])
                            rawPrice = Number(outcomePrices[0]);
                    }
                    catch (e) { }
                }
                if (rawPrice === null)
                    return [];
                return [{
                        id: String(m.id),
                        parentId: String(event.id),
                        question: m.question || event.title,
                        description: m.description || event.description,
                        category: event.category || null,
                        closeTime: m.endDate || null,
                        resolved: false,
                        liquidity: Number(m.liquidityNum) || Number(m.liquidity) || 0,
                        volume: Number(m.volumeNum) || Number(m.volume) || 0,
                        probability: Math.round(rawPrice * 100),
                        rawPrice: rawPrice,
                        // הוספת הטוקנים לאובייקט המוחזר
                        tokenYesId,
                        tokenNoId
                    }];
            });
        });
        console.log(`\n🚀 Real-Time Sync: Found ${allSpecificMarkets.length} active Yes/No markets.`);
        if (allSpecificMarkets.length > 0) {
            console.table(allSpecificMarkets.slice(0, 15).map(m => ({
                Question: m.question.substring(0, 40),
                'Chance %': m.probability + '%',
                YesToken: m.tokenYesId?.substring(0, 10) + '...',
                NoToken: m.tokenNoId?.substring(0, 10) + '...'
            })));
        }
        return allSpecificMarkets;
    }
    catch (error) {
        console.error('Failed to fetch Polymarket markets:', error);
        return [];
    }
}
