namespace ZTRAK.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class UserLogin : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.AspNetUsers", "FirstName", c => c.String());
            AddColumn("dbo.AspNetUsers", "LastName", c => c.String());
            AddColumn("dbo.AspNetUsers", "ConfirmationToken", c => c.String());
            AddColumn("dbo.AspNetUsers", "IsConfirmed", c => c.Boolean(nullable: false));
            AddColumn("dbo.AspNetUsers", "TeamName", c => c.String());
            AddColumn("dbo.AspNetUsers", "RoleName", c => c.String());
            AddColumn("dbo.AspNetUsers", "CellNumber", c => c.String());
            AddColumn("dbo.AspNetUsers", "CellCarrier", c => c.String());
            AddColumn("dbo.AspNetUsers", "SMS", c => c.String());
            AddColumn("dbo.AspNetUsers", "PinNumber", c => c.String());
            AddColumn("dbo.AspNetUsers", "Notes", c => c.String());
            AddColumn("dbo.AspNetUsers", "Company", c => c.String());
        }
        
        public override void Down()
        {
            DropColumn("dbo.AspNetUsers", "Company");
            DropColumn("dbo.AspNetUsers", "Notes");
            DropColumn("dbo.AspNetUsers", "PinNumber");
            DropColumn("dbo.AspNetUsers", "SMS");
            DropColumn("dbo.AspNetUsers", "CellCarrier");
            DropColumn("dbo.AspNetUsers", "CellNumber");
            DropColumn("dbo.AspNetUsers", "RoleName");
            DropColumn("dbo.AspNetUsers", "TeamName");
            DropColumn("dbo.AspNetUsers", "IsConfirmed");
            DropColumn("dbo.AspNetUsers", "ConfirmationToken");
            DropColumn("dbo.AspNetUsers", "LastName");
            DropColumn("dbo.AspNetUsers", "FirstName");
        }
    }
}
