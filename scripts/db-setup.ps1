$psql = "F:\Tools\postgresql\pgsql\bin\psql.exe"

$databases = @("hrms_dev", "hrms_shadow")

foreach ($db in $databases) {
    Write-Host "Checking if database $db exists..."
    $exists = & $psql -U hrms_user -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$db'"
    if ($exists -eq "1") {
        Write-Host "Database $db already exists."
    } else {
        Write-Host "Creating database $db..."
        & $psql -U hrms_user -d postgres -c "CREATE DATABASE $db;"
    }
}

Write-Host "Database setup complete."
