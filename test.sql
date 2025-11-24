ALTER TABLE dbo.GdprLog
ADD CONSTRAINT FK_GdprLog_ActorAdminUser
    FOREIGN KEY (ActorAdminId) REFERENCES dbo.Admin(AdminId)
    ON DELETE NO ACTION;
