CREATE OR ALTER FUNCTION dbo.fn_HashPassword
(
    @Password NVARCHAR(4000)
)
RETURNS VARCHAR(64)   -- Or CHAR(64) if you prefer fixed length
AS
BEGIN
    DECLARE @hash VARBINARY(32);
    SET @hash = HASHBYTES('SHA2_256', @Password);

    -- Style 2 = hex string without 0x prefix
    RETURN CONVERT(VARCHAR(64), @hash, 2);
END;
GO
