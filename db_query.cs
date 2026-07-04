using System;
using System.Data;
using Microsoft.Data.SqlClient;

class Program {
    static void Main() {
        var connStr = "Server=arabicschoolnew.database.windows.net;Database=ArabicSchool;User ID=ksawalha;Password=Karamsawalha1234!;Encrypt=false;TrustServerCertificate=true;Connection Timeout=30;";
        using var conn = new SqlConnection(connStr);
        conn.Open();
        var cmd = new SqlCommand("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'BatchJobs'", conn);
        using var rdr = cmd.ExecuteReader();
        while (rdr.Read()) {
            Console.WriteLine("$("{rdr.GetString(0)}") : $("{rdr.GetString(1)}")");
        }
    }
}
