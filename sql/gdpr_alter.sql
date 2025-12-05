ALTER TABLE [dbo].[GdprRequest]
ADD CONSTRAINT DF_GdprRequest_RequestedAt
    DEFAULT (SYSUTCDATETIME()) FOR [RequestedAt];
