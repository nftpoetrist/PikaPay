import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json(null, { status: 400 });

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd` +
        `&ids=${encodeURIComponent(id)}&order=market_cap_desc&per_page=1` +
        `&sparkline=false&price_change_percentage=1h%2C24h%2C7d`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 },
      },
    );
    if (!res.ok) return NextResponse.json(null, { status: res.status });
    const [coin] = await res.json();
    return NextResponse.json(coin ?? null, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}
