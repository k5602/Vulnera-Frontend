export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { query } = body;

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        let answer = "I am processing your request. As an AI vulnerability analyst, I can help you identify security flaws.";
        let references = ["https://owasp.org/www-project-top-ten/"];

        if (query.toLowerCase().includes("sql injection")) {
            answer = "To fix SQL injection vulnerabilities, you should use parameterized queries or prepared statements. Avoid concatenating user input directly into SQL strings. ORMs often handle this automatically.";
            references = [
                "https://owasp.org/www-community/attacks/SQL_Injection",
                "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html"
            ];
        } else if (query.toLowerCase().includes("xss") || query.toLowerCase().includes("cross-site scripting")) {
            answer = "Cross-Site Scripting (XSS) can be prevented by escaping user input before rendering it in the browser. Use Content Security Policy (CSP) headers and modern frameworks that auto-escape content.";
            references = [
                "https://owasp.org/www-community/attacks/xss/",
                "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html"
            ];
        } else if (query.toLowerCase().includes("hello") || query.toLowerCase().includes("hi")) {
            answer = "Hello! I am VulneraAI. I can assist you with vulnerability analysis, code security, and remediation strategies. How can I help you today?";
            references = [];
        }

        return new Response(JSON.stringify({
            answer,
            references
        }), {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            error: "Invalid request body"
        }), {
            status: 400,
            headers: {
                "Content-Type": "application/json"
            }
        });
    }
}
