const sql = require('mssql');
const fs = require('fs');
(async () => {
    try {
        await sql.connect('Server=arabicschoolnew.database.windows.net;Database=ArabicSchool;User ID=ksawalha;Password=Karamsawalha1234!;Encrypt=true;TrustServerCertificate=true;Connection Timeout=30;');
        const result = await sql.query("SELECT TOP 1 content FROM templates WHERE name = 'gradcerach'");
        const content = result.recordset[0].content;
        fs.writeFileSync('gradcerach.html', Buffer.from(content, 'base64').toString('utf8'));
        console.log('done');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
