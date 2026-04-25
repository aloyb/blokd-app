const fetch = require("cross-fetch");

async function test() {
  // Try SOL mint variations
  const solMints = [
    'So11111111111111111111111111111111111111111112',
    'So11111111111111111111111111111111111111112',
    '11111111111111111111111111111111'
  ];
  
  for (const mint of solMints) {
    console.log(`\nTesting mint: ${mint}`);
    const url = `https://api.jup.ag/swap/v2/order?inputMint=${mint}&outputMint=GSErga4VnqbmHSe9SPpyb7iAp3gkbU8oeDT6M1BQpump&amount=30000000&slippageBps=500&taker=6qSukCpLp5kg8jMMTXVG2zy2d1XNpF7n8c8xvoaaJEej`;
    
    try {
      const res = await fetch(url, { timeout: 10000 });
      const data = await res.json().catch(() => null);
      console.log('Status:', res.status, 'Error:', data?.error || 'none');
    } catch(e) {
      console.log('Fetch error:', e.message.substring(0, 50));
    }
  }
}

test();
