REM Copy Javascript files
XCOPY ..\Kidoju.Widgets\src\js .\js /E /I /R /Y
ATTRIB +R .\js\*.* /S

REM Copy styles
XCOPY ..\Kidoju.Widgets\src\styles .\styles /E /I /R /Y
ATTRIB +R .\styles\*.* /S

REM copy kidoju.integration.designmode.html
ATTRIB -R .\index.html
COPY ..\Kidoju.Widgets\src\kidoju.integration.designmode.html .\index.html /Y
ATTRIB +R .\index.html

REM copy kidoju.integration.playmode.html
ATTRIB -R .\play.html
COPY ..\Kidoju.Widgets\src\kidoju.integration.playmode.html .\play.html /Y
ATTRIB +R .\play.html

REM Copy data
XCOPY ..\Kidoju.Widgets\test\data .\data /E /I /R /Y
ATTRIB +R .\data\*.* /S
