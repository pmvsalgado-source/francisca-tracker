export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  
  const results = { hcp: null, wagr: null, error: null }

  // Fetch FPG handicap
  try {
    const fpgRes = await fetch('https://portal.fpg.pt/handicaps-course-rating/pesquisa-de-handicaps/?nome=francisca+salgado&nfed=43832', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }
    })
    const html = await fpgRes.text()
    const hcpMatch = html.match(/43832[\s\S]{0,200}?(\+?\d+[\.,]\d+)/)
    if (hcpMatch) results.hcp = hcpMatch[1].replace(',', '.')
  } catch (e) {
    results.error = 'FPG: ' + e.message
  }

  // Fetch WAGR
  try {
    const wagrRes = await fetch('https://www.wagr.com/playerprofile/francisca-salgado-43158', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }
    })
    const html = await wagrRes.text()
    const rankMatch = html.match(/world.*?rank.*?(\d+)/i) || html.match(/rank[^"]*"[^"]*">(\d+)/) || html.match(/#(\d+)/)
    if (rankMatch) results.wagr = rankMatch[1]
  } catch (e) {
    results.error = (results.error || '') + ' WAGR: ' + e.message
  }

  res.status(200).json(results)
}
