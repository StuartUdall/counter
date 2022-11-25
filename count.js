define('modules/customScript', ["ui.api.v1", "models/server/callConstants", "models/server/permissionsConstants"], function (
    UiApi,
    CallConstants,
    PermissionsConstants
  ) {


    // one or more objects containing contactField to be mapped to a call variable
    // callVariable should be in the format of Group.CavName. i.e. Custom.my_var
    // IMPORTANT: make sure that the call variable is on the layout tab of the campaign profile, and is NOT read-only
    const contactFieldsToMap = [
      {
        contactField: 'accountNum',
        callVariable: 'Reporting.AccountNum'
      }

    ];


    // Do not modify below here

    let customScript = {};

    customScript.initialize = function () {
      UiApi.Logger.info(`custom-script__", "initialize function`);
    };

    //---------------------------------------------------
    customScript.onModelLoad = function () {
      UiApi.Logger.info("custom-script__", "onModelLoad");

      const agent = UiApi.Root.Agent(UiApi.Context.AgentId);

      // add listener
      agent.Call().on("change", this.onCallState, this);

    };

    //---------------------------------------------------
    customScript.onModelUnload = function () {
      UiApi.Logger.debug("custom-script__", "onModelUnload");
    };


    //---------------------------------------------------
    customScript.onCallState = async function () {
      const activeTask = UiApi.ComputedModels.activeTasksModel().getActiveTask(UiApi.ActiveTaskType.Call);

      if (!activeTask) {
        return;
      }

      const callId = activeTask.id;
      UiApi.Logger.debug("custom-script__", "onCallState", `CallID: ${callId}`);

      const callModel = UiApi.Root.Agent(UiApi.Context.AgentId).Call(callId);
      const newState = callModel.get("state");
      const callType = callModel.get("callType");

      UiApi.Logger.info(
        "custom-script__onCallState", `callId: ${callId}, state: ${newState}, callType: ${callType}`
      );


      if (newState === 'TALKING') {

        if (contactFieldsToMap) {

          let callVariables = UiApi.Context.Tenant.CallVariables();
          let contactFields = UiApi.Context.Tenant.ContactFields();

          contactFieldsToMap.forEach(mapping => {
            this.mapContactFieldToCav(mapping, callModel, callVariables, contactFields);
          });

        }

      }

    };


    customScript.mapContactFieldToCav = function (mapping, callModel, callVariables, contactFields) {
      try {

        UiApi.Logger.debug('custom-script__', `starting function mapContactFieldToCav()`, mapping);

        let cav = this.getCallVariableByName(callVariables, mapping.callVariable);
        let cav_value = callModel.attributes.variables[cav.id];

        let cf = this.getContactFieldByName(contactFields, mapping.contactField);
        let cf_value = callModel.attributes.activeContact.fields[cf.id];

        UiApi.Logger.debug('custom-script__', `ContactField: ${mapping.contactField}: ${cf_value} || CAV: ${mapping.callVariable}: ${cav_value}`);

        if (cf_value && cav_value != cf_value) {
          UiApi.Logger.debug('custom-script__', `Proceeding with setting CAV! "${cav_value}" -->  "${cf_value}"`);
          callModel.setCallVariable(cav.id, cf_value);
        }

      } catch (err) {
        UiApi.Logger.debug('custom-script__', `Error setting CAV!`, mapping, err);
      }

    };


    customScript.getContactFieldByName = function (cfs, cfName) {
      return _.find(
        cfs.models,
        function (cf) {
          return cf.get("name") === cfName;
        },
        this
      );
    };


    customScript.getCallVariableByName = function (cavs, cavName) {
      const parts = (cavName || "").split(".");
      if (parts.length === 2) {
        return _.find(
          cavs.models,
          function (cav) {
            return cav.get("group") === parts[0] && cav.get("name") === parts[1];
          },
          this
        );
      }
    };


    return customScript;
  });



  define('workflow/init', ['ui.api.v1', 'modules/customScript'],
    function (UiApi, customScript) {
      return {
        initialize: function () {
          //Place your library initialization code here
          UiApi.Logger.debug('custom-script__', 'init:workflow:initialize');
          customScript.initialize();
        },

        onModelLoad: function () {
          //Place your server model subscription code here
          UiApi.Logger.debug('custom-script__', 'init:workflow:onModelLoad');
          customScript.onModelLoad();
        },

        onModelUnload: function () {
          //Place your cleanup code here
          UiApi.Logger.debug('custom-script__', 'init:workflow:onModelUnload');
          customScript.onModelUnload();
        }
      };
    });



  define('3rdparty.bundle', [
    'ui.api.v1',
    'handlebars',
    'workflow/init'

    //presentations models

    //components

  ],
    function (UiApi, Handlebars, Init) {

      UiApi.config({});

      require.config({
        map: {
          '*': {
          }
        }
      });

      Init.initialize();
      UiApi.vent.on(UiApi.PresModelEvents.WfMainOnModelLoad, function () {
        Init.onModelLoad();
      });
      UiApi.vent.on(UiApi.PresModelEvents.WfMainOnModelUnload, function () {
        Init.onModelUnload();
      });
    });
