KANBAN AND PROJECT PLANNING TOOLS - POC
=================================

    TODO: Think of a good name for this thing

Although this project includes a lot of functionality and is currently in-use on real-world software projects, it is still a proof-of-concept. It's lacking maintainability (e.g. test coverage, automated builds), security, and scalability to be a viable app. The goals of open-sourcing the project are to inspire discussions in the agile project management community and inspire a community of people building more modern tools for this industry.

This code is released under the Apache license, version 2.0. See LICENSE.

Purpose
-------
This repository contains two tools in a single Node.js project:
* Kanban metrics reporting website and periodic automatic synchronization with TFS and VSTS (URL: `/`)
* Monte Carlo simulation tool for project planning and risk management (URL: `/sim`)

Architecture
------------
The back-end is a Node.js web app with Express. There is no database for much of the data used by the system. The project is in transition from storing all data and configuration in JSON files to using a Mongo database for almost everything. Kanban metrics data synchronized with TFS is stored in a JSON file. Configuration is set in JSON files. User data and classes of service configurations are stored in Mongo.

User authentication uses an Active Directory server over LDAP.

Jade is the back-end templating engine. TFS synchronization is accomplished with command-line Node.js programs.

The front-end is Angular.JS and D3 for data visualizations. The C3 wrapper for D3 is used in most cases, rather than D3 directly. The Kanban and project planning tools are separate single-page applications.

All of the software is platform-independent. There is some code to facilitate running as a service on Windows, but Windows is not required.

Known Issues / Limitations
--------------------------

The TFS decorator component only authenticates to TFS with NTLM and will probably only use the HTTP protocol. The TFS extractor will work with either TFS or VSO, using http or https, and basic auth or personal access tokens. TODO: offer multiple authentication options and https support for the TFS decorator, necessary for VSO compatibility (super easy).

Configuration Files
-------------------
Before you can run anything in this project, a lot of configuration is required. All the configuration files are JSON. The file names are not important, and you can use whatever names you want. This README includes recommended file names.

### tfsextractor.config.json

The */bin/tfsextractor.js* command-line program retrieves data from TFS and processes it into the model needed by the Kanban metrics web app. It needs a configuration file that looks like this:

    {
      "url": "http://tfsserver:8080/tfs/someCollection",
      "mongoConnection": "mongodb://localhost/projector",
      "credentialsFile": "c:\\nodedeploys\\projectorprod\\tfscredentials.json",
      "maxConcurrentRequests": 6,
      "revisionsStep": 200,
      "modelStorageFile": "c:\\nodedeploys\\projectorprod\\data\\Model.json"
    }

* `url` - This is the URL of your TFS instance.
* 'mongoConnection' - Standard URL format for a Mongo DB.
* `credentialsFile` - This is a file that contains your TFS credentials. See tfscredentials.json below.
* `maxConcurrentRequests` - Limits the number of concurrent HTTP requests when communicating with the TFS server.
* `revisionsStep` - The requests for work item history in the TFS REST API are paged. This is the page size the extractor will use for these requests. The page size corresponds to the number of work item revisions requested. **This page size must be less than or equal to the maximum page size enforced by the TFS API.** If this is set higher, then the Kanban metrics will be invalid due to missing revisions.
* `modelStorageFile` - Path and file name for the JSON file that stores the Kanban metrics model. This file is used by the TFS decorator and the Kanban web app.

### tfscredentials.json

Provides the credentials used to authenticate to TFS via NTLM or using a personal access token.

NTLM method:

    {
        "username": "CaptainTuttle",
        "password": "isreal",
        "domain":	"mash"

    }

Personal access token method:

{
	"method": "personalToken",
	"token": "thetoken"

}

### www.config.json

This is the configuration file for */bin/www*.

    {
      "modelStorageFile": "c:\\nodedeploys\\projectorprod\\data\\Model.json",
      "setupAllowed": true,
      "mongoConnection": "mongodb://localhost/projector",
      "ActiveDirectoryConfig": {
        "domain.net": {
          "url": "ldap://domaincontroller.net",
          "username": "user@vdomain.net",
          "password": "password",
          "baseDN": "dc=domain,dc=net"
        },
        "domain.com": {
          "url": "ldap://domaincontroller.com",
          "username": "user@vdomain.com",
          "password": "password",
          "baseDN": "dc=domain,dc=com"
        }
      },
      "usernameSuffix": "@vcs.coaxis.net",
      "initialAdmin": "mitch.huff,
      "jwtSecret": "shhhh",
      "jwtExpirationSeconds": 86400,
      "tfsCredentialsFile": "../../tfscredentials.json"
    }

* `modelStorageFile` - Path and file name for the JSON file that stores the Kanban metrics model. This file is used by the TFS decorator and the Kanban web app.
* `dowStart` - The throughput graph in the Kanban metrics web app shows the number of items closed per week. This parameter specifies the day of the week that should denote the boundary between weeks. Sunday is zero.
* TODO - explain all the other parameters

Files and Directories
---------------------

TODO - Some new directories and conventions have been added recently, so this list is out-of-date.

* */package.json* - Standard Node.JS configuration. There are a few lines to make it easier to run as a service on Windows with winser.
    * The `npm start` line shows how the web app needs to be invoked. See command-line parameters below.
* */bin*
    * */bin/www* - Starts the webserver. Needs these command-line arguments (configured in package.json for `npm start`):
        1. Port number for the webserver
        1. Config file - see the section on config files below
    * */bin/tfsextractor.js* - Command-line Node.js program to extract data from TFS and persist it for the Kanban metrics web app as a model (see projectormodel.js). Takes the following command-line parameters:
        1. Config file - see section on config files below
        1. "skipdownload" (optional, without the quotes) - if specified as the second parameter, the TFS extractor will not download data from TFS and instead reprocess data that has already been persisted.
    * *tfsdecorator.js* - Command-line Node.js program that updates work items in TFS with cycle time data that has already been calculated and persisted by the tfsextractor. Supply the config file as the first and only command-line parameter. See the section on config files below.
* */modules* - These are Node.js modules developed specifically for this project.
    * *projectormodel.js* - A very small module to help with basic operations on the model used by tfsextractor.js, tfsdecorator.js, and the Kanban metrics web app.
    * *tfsdecorator.js* - The code behind the tfsdecorator.js program in /bin in modular form.
* */public* - Express will just serve these up directly.
    * */js/angular_c3_simple.js* - I need to properly fork this Bower module. Had to customize it (hacky).
    * */js/FileSaver.js* - A library for saving files in the browser that I didn't install withi Bower.
    * */js/jstat.js* and jstat.min.js - JStat library that I didn't install with Bower.
    * */js/kanbanctrl.js* - Angular controller for the Kanban metrics web app.
    * */js/simctrl.js* - Angular controller for the project planning web app.
    * */js/whenReady.js* - Angular directive snagged from StackOverflow.
    * */stylesheets/charts.css* - Styles for the C3 charts in the web apps.
    * */stylesheets/style.css* - Styles for the web apps.
* */routes/index.js* - Express router for the web apps. Does the command-line parameter parsing for /bin/www.
* */routes/users.js* - Boilerplate Express.
* */views*
    * *error.jade* - Boilerplate Express.
    * *index.jade* - Jade template for the Kanban metrics web app.
    * *layout.jade* - Jade template applied to all the other Jade templates.
    * *sim.jade* - Jade template for the project planning web app.

Everything else is either self-explanatory or boilerplate Node.JS+Express.

Kanban Model
------------

The tfsextractor.js command-line app should be run on a schedule to retrieve data from TFS, calculate Kanban metrics, and store metrics in the Kanban model file for the web app to display. It fully refreshes the Kanban model with every execution. There is no incremental update feature available yet.

The Kanban model is a Javascript object stored in a JSON file. It has this structure:

* *additionalInfoFields* - Array from the ClassesOfService.json config file
* *classesOfService* - Array. Includes all the data from the classes of service in the CLassesOfService.json config file, plus additional values for each class:
    * *itemsClosed* - Array of item IDs in this class that are in the Closed state.
    * *itemsAll* - Array of item IDs that have ever been in this class.
    * *columnNames* - Array of Kanban board column names that have ever held an item on this board for this class of service.
    * *minDate* - Earliest date an item was closed.
    * *maxDate* - Latest date an item was closed.
* *allItems* - Array of all item IDs covering all items across all classes of service.
* *allBoards* - Array of all distinct board IDs form the classes of service.
* *itemHistory* - An object. Keys are item IDs. Values are arrays of these revision objects:
    * *changedDate* - The date of this revision.
    * *value of a board ID* - Objects with these properties (could be multiple objects, each keyed with a board ID):
        * *newValue* - Name of the Kanban board column to which this item was moved.
        * *oldValue* - Optional. Name of the Kanban board column this item was in before it moved to newValue.
* *itemInfo* - An object. Keys are item IDs. Values are these objects:
    * *type* - Type of work item.
    * *title* - Title of the work item.
    * *keys and values copied from the system of record (TFS) based on additionalInfoFields*
    * *boards* - Array of objects:
        * *board* - Board ID where the item is currently visible.
        * *column* - Name of the column in which this item currently resides.
* *columnsForBoard* - An object. Keys are board IDs. Values are arrays of column names that ever held any work items.
* *rawCycleTimes* - An object. Keys are item IDs. Values are objects:
    * *value of a board ID*: Array of objects:
        * *columnName* - Name of a column on the Kanban board corresponding to this board ID.
        * *bizDays* - Number of business days this item resided in this column on this board.


Deployment on Windows
--------------------

Look at the documentation for the winser NPM module to figure out how to install the web server as a service.

Use the Windows task scheduler to regularly run the TFS extractor.

For authentication to Active Directory, a somewhat ridiculous installation process is required in Windows because some of the NPM modules use compiled binaries. You'll need node-gyp, which will require you to install the free version of Visual Studio, among other acrobatics, so look at the Windows installation instructions for node-gyp.

Deployment on Linux/Mac
---------------------

There's nothing really unusual about the project. Deploy it as a typical MEAN stack and be glad you don't have to worry about Windows.


Known Issues
-----------------

You need to have an initial Kanban model JSON file for all features to work properly on a clean deployment. The only thing that doesn't work is showing available columns in the class of service edit screen. TODO - fix this
