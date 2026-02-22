const BASE_FALLBACK = process.env.POLY_REST_URL || 'https://gamma-api.polymarket.com'

export async function fetchMarkets(): Promise<any[]> {
  const url = new URL('/events', BASE_FALLBACK)
  
  // פילטרים ראשוניים בבקשה ל-API
  url.searchParams.set('active', 'true')
  url.searchParams.set('closed', 'false')
  url.searchParams.set('include_markets', 'true')
  url.searchParams.set('limit', '100')
  url.searchParams.set('order', 'volume')
  url.searchParams.set('ascending', 'false')
// פקודה שתנקה את הכל בכוח (Force Clear)
  try {
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`Polymarket API error: ${res.status}`);
    const json = await res.json();
    if (!Array.isArray(json)) return [];

    const allSpecificMarkets = json.flatMap((event: any) => {
      // 1. סינון ברמת ה-Event (לוודא שהנושא הגדול עדיין פעיל)
      if (!event.active || event.closed) return [];
      if (!event.markets || !Array.isArray(event.markets)) return [];

      return event.markets.flatMap((m: any) => {
        // 2. סינון ברמת ה-Market הספציפי (חשוב מאוד!)
        // אנחנו רוצים רק שווקים פתוחים ופעילים
        if (!m.active || m.closed === true) return [];

        // 3. בדיקה שמדובר ב-Yes/No (בדיוק 2 תוצאות)
        let outcomeNames: string[] = [];
        try {
          outcomeNames = typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : m.outcomes;
        } catch (e) {
          outcomeNames = m.outcomeNames || [];
        }
        if (outcomeNames.length !== 2) return [];

        // 4. חישוב הסיכוי (Probability)
        // משתמשים ב-lastTradePrice כעדיפות ראשונה לדיוק מקסימלי
        // אם אין מסחר אחרון, עוברים ל-outcomePrices (מחיר נוכחי בספר הפקודות)
        let rawPrice: number | null = null;
        
        if (m.lastTradePrice && Number(m.lastTradePrice) > 0) {
          rawPrice = Number(m.lastTradePrice);
        } else {
          let outcomePrices: string[] = [];
          try {
            outcomePrices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
            if (outcomePrices?.[0]) rawPrice = Number(outcomePrices[0]);
          } catch (e) {}
        }

        // אם המחיר הוא 0 או 1 בשוק פעיל, זה בדרך כלל אומר שאין נזילות מספקת או שהשוק ממש בקצה
        if (rawPrice === null) return [];

        return [{
          id: String(m.id),
          parentId: String(event.id),
          question: m.question || event.title,
          description: m.description || event.description,
          category: event.category || null,
          closeTime: m.endDate || null,
          resolved: false, // כי סיננו רק active:true
          liquidity: Number(m.liquidityNum) || Number(m.liquidity) || 0,
          volume: Number(m.volumeNum) || Number(m.volume) || 0,
          probability: Math.round(rawPrice * 100), // האחוז שיוצג ב-UI
          rawPrice: rawPrice
        }];
      });
    });

    console.log(`\n🚀 Real-Time Sync: Found ${allSpecificMarkets.length} active Yes/No markets.`);
    
    if (allSpecificMarkets.length > 0) {
      console.table(allSpecificMarkets.slice(0, 15).map(m => ({
        Question: m.question.substring(0, 50),
        'Chance %': m.probability + '%',
        Volume: `$${Math.floor(m.volume).toLocaleString()}`
      })));
    }

    return allSpecificMarkets;
  } catch (error) {
    console.error('Failed to fetch Polymarket markets:', error);
    return [];
  }
}