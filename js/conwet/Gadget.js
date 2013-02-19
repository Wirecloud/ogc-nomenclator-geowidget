/*
 *     Copyright (c) 2013 CoNWeT Lab., Universidad Politécnica de Madrid
 *
 *     This file is part of the GeoWidgets Project,
 *
 *     http://conwet.fi.upm.es/geowidgets
 *
 *     Licensed under the GNU General Public License, Version 3.0 (the 
 *     "License"); you may not use this file except in compliance with the 
 *     License.
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     under the License is distributed in the hope that it will be useful, 
 *     but on an "AS IS" BASIS, WITHOUT ANY WARRANTY OR CONDITION,
 *     either express or implied; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *  
 *     See the GNU General Public License for specific language governing
 *     permissions and limitations under the License.
 *
 *     <http://www.gnu.org/licenses/gpl.txt>.
 *
 */

use("conwet");

conwet.Gadget = Class.create({

    initialize: function() {
        // EzWeb variables
        this.locationInfoEvent = new conwet.events.Event('location_info_event');
        this.locationEvent     = new conwet.events.Event('location_event');
        this.outputTextEvent   = new conwet.events.Event('output_text_event');
        this.searchTextEvent   = new conwet.events.Event('search_text_event');

        this.searchTextSlot    = new conwet.events.Slot('search_text_slot', function(text) {
            this.searchInput.value = text;
            this._sendSearchRequest(this.serviceSelect.getSelectedValue(), this.searchInput.value);
        }.bind(this));

        this.wfsServiceSlot   = new conwet.events.Slot('wfs_service_slot', function(service) {
            service = service.evalJSON();
            if (typeof service == 'object') {
                if (('type' in service) && ('url' in service) && ('service_type' in service) && ('name' in service) && (service.type == "WFS") && (service.url != "")) {
                    this.addWfsService(service, true);
                    this.showMessage(_("Se ha recibido un nuevo servidor."));
                    this.save();
                }
            }
        }.bind(this));

        this.servicesPreference = EzWebAPI.createRWGadgetVariable('services');

        // Attributes
        this.messageManager = new conwet.ui.MessageManager(3000);
        this.transformer    = new conwet.map.ProjectionTransformer();

        this.draw();
    },

    draw: function() {
        var header = $("header");
        conwet.ui.UIUtils.ignoreEvents(header, ["click", "dblclick"]);

        var serviceLabel = document.createElement("div");
        $(serviceLabel).addClassName("label");
        serviceLabel.appendChild(document.createTextNode(_("Servicio WFS:")));
        header.appendChild(serviceLabel);

        this.serviceSelect = new conwet.ui.StyledSelect({"onChange": function(){}});
        this.serviceSelect.addClassName("service");
        this.serviceSelect.insertInto(header);

        this.serviceSelect.addOption(_('Select a server'), '', {"selected": true, "onRemove": this.save.bind(this)});

        if (this.servicesPreference.get() != "") {
            var services = this.servicesPreference.get().evalJSON();

            for (var i=0; i<services.length; i++) {
                this.addWfsService(services[i], i==0);
            }
        }

        var searchLabel = document.createElement("div");
        $(searchLabel).addClassName("label");
        searchLabel.appendChild(document.createTextNode(_("Topónimo:")));
        header.appendChild(searchLabel);

        var searchDiv = document.createElement("div");
        $(searchDiv).addClassName("search");
        header.appendChild(searchDiv);

        this.searchInput = document.createElement("input");
        this.searchInput.type = "text";
        $(this.searchInput).addClassName("search");
        searchDiv.appendChild(this.searchInput);

        var searchButton = conwet.ui.UIUtils.createButton({
            "classNames": ["search_button"],
            "title"     : _("Buscar topónimo"),
            "value"     : _("Buscar"),
            "onClick"   : function(e) {
                this.sendSearch(this.searchInput.value);
                this._sendSearchRequest(this.serviceSelect.getSelectedValue(), this.searchInput.value);
            }.bind(this)
        });
        header.appendChild(searchButton);

    },

    addWfsService: function(service, selected) {
        this.serviceSelect.addOption(service.name, service, {"removable": true, "selected": selected});
    },

    save: function() {
        var options = this.serviceSelect.options;
        var services = [];
        for (var i=0; i<options.length; i++) {
            var service = options[i].getValue();
            if (service != "") {
                services.push(service);
            }
        }
        this.servicesPreference.set(Object.toJSON(services));
    },

    sendLocation: function(lon, lat) {
        this.locationEvent.send(lon + "," + lat);
    },

    sendLocationInfo: function(lon, lat, title) {
        this.locationInfoEvent.send(Object.toJSON({
            "position": {
                "lon": lon,
                "lat": lat
            },
            "title": title
        }));
    },

    sendText: function(text) {
        this.outputTextEvent.send(text);
    },

    sendSearch: function(text) {
        this.searchTextEvent.send(text);
    },

    _sendSearchRequest: function (service, word) {
        this.clearUI();

        var baseURL = service.url;

        if ((baseURL == "") || (word == "")) {
            this.showMessage(_("Faltan datos en el formulario."));
            return;
        }

        if (baseURL.indexOf('?') == -1) {
            baseURL = baseURL + '?';
        } else {
            if (baseURL.charAt(baseURL.length - 1) == '&') {
                baseURL = baseURL.slice(0, -1);
            }
        }

        var lowerIndex = 0;
        var upperIndex = 20;

        var url = "http://idezar.zaragoza.es/IDEE-MapViewerGazetteer/SearchControllerJSONServlet?" +
        "operation=queryServer" +
        "&sourceRDF=" +
        "&callbackName=" +
        "&numResultsComponentsValues=0" +
        "&lowerIndex=" + lowerIndex +
        "&upperIndex=" + upperIndex +
        "&initiallySelectedSource=false";

        if (service.service_type.toUpperCase() != "MNE") {
            url += 
            "&sourceName=" + this._encodeASCII(baseURL) +
            "&sourceTitle=" +
            "&useSourceRDF=false" +
            "&useRDFMetadata=true" +
            "&createRDF=true" +
            "&sourceServiceType=" + service.service_type +
            "&sourceServiceURL=" + baseURL +
            "&query=" + this._encodeASCII(
                "<Filter>" +
                    "<PropertyIsLike>" +
                        "<PropertyName>mne:Entidad/mne:nombreEntidad/mne:NombreEntidad/mne:nombre</PropertyName>" +
                        "<Literal>" + word + "</Literal>" +
                    "</PropertyIsLike>" +
                "</Filter>"
            );
        }
        else {
            url += 
            "&sourceName=sourceAccessWFS-EGN-NGC.rdf" +
            "&sourceTitle=" +
            "&useSourceRDF=true" +
            "&useRDFMetadata=false" +
            "&createRDF=false" +
            "&sourceServiceType=" +
            "&sourceServiceURL=" +
            "&query=" + this._encodeASCII(
                "<Filter>" +
                    "<PropertyIsLike>" +
                        "<PropertyName>mne:Entidad/mne:nombreEntidad/mne:NombreEntidad/mne:nombre</PropertyName>" +
                        "<Literal>" + word + "</Literal>" +
                    "</PropertyIsLike>" +
                "</Filter>"
            );
        }

       //&sourceTitle=Nomenclux00E1torux0020EuroGeonames

        this.showMessage(_("Solicitando datos al servidor."), true);
        //TODO Gif chulo para esperar
        EzWebAPI.send_get(
            url,
            this,
            function(transport) {
                this.hideMessage();
                this._drawEntities(eval(transport.responseText), lowerIndex , upperIndex);
            }.bind(this),
            function(){
                this.showError(_("El servidor no responde."));
            }
        );
    },

    _encodeASCII: function(word) {
        var aux = "";
        for (var i=0; i<word.length; i++) {
            var code = word.charCodeAt(i);
            if (((code >= 65) && (code <= 90)) || ((code >= 48) && (code <= 57)) || ((code >= 97) && (code <= 122))) {
                aux += word.substr(i, 1);
            }
            else {
                aux += ("ux00" + word.charCodeAt(i).toString(16).toUpperCase());
            }
        }
        return aux;
    },

    _decodeASCII: function(word) {
        var aux = "";
        var i = 0;
        while (i <= word.length-5) {
            if (word.substr(i, 4).toLowerCase() == "ux00") {
                if (i+5 < word.length) {
                    var code = word.charCodeAt(i+5);
                    if (((code >= 65) && (code <= 70)) || ((code >= 48) && (code <= 57)) || ((code >= 97) && (code <= 102))) {
                        aux += String.fromCharCode(parseInt(word.substr(i+4, 2), 16));
                        i += 6;
                        continue;
                    }
                }
                aux += String.fromCharCode(parseInt(word.substr(i+4, 1), 16));
                i += 5;
            }
            else {
                aux += word.substr(i, 1);
                i++;
            }
        }
        return aux + word.substr(i, word.length-i);
    },

    _drawEntities: function(json, lowerIndex , upperIndex) {
        this.clearUI();

        var nEntities = json[1].totalLength;
        var entities = json[2];

        for (var i=0; i<entities.length; i++) {
            var entity = entities[i];

            var div = document.createElement("div");
            $(div).addClassName("feature");

            var context = {
                "div"   : div,
                "entity": entity,
                "url"   : this._decodeASCII(json[1].sourceServiceURL),
                "type"  : json[1].sourceServiceType,
                "self"  : this
            };

            div.title = _("Send event");
            div.observe("click", function(e) {
                this.self.sendText(this.self._decodeASCII(this.entity[1][0].text));
                this.self._sendGetEntityRequest(this.url, this.entity, this.type);
                //this.self._selectFeature(this.feature, this.div);
            }.bind(context));
            div.observe("mouseover", function(e) {
                this.div.addClassName("highlight");
            }.bind(context), false);
            div.observe("mouseout", function(e) {
                this.div.removeClassName("highlight");
            }.bind(context), false);

            var title = document.createElement("span");
            $(title).addClassName("title");
            title.innerHTML = this._decodeASCII(entity[1][0].text);
            div.appendChild(title);

            var type = document.createElement("span");
            $(type).addClassName("type");
            type.innerHTML = " (" +this._decodeASCII(entity[1][1].text) + ")";
            div.appendChild(type);

            $("list").appendChild(div);
        }
    },

    _sendGetEntityRequest: function (baseURL, entity, type) {
        this._clearDetails();

        if (baseURL.indexOf('?') == -1) {
            baseURL = baseURL + '?';
        } else {
            if (baseURL.charAt(baseURL.length - 1) == '&') baseURL = baseURL.slice(0, -1);
        }

        baseURL = "http://idezar.zaragoza.es/IDEE-MapViewerGazetteer/SearchControllerJSONServlet?" +
        "operation=getCompleteServer" +
        "&callbackName=" +
        "&locale=es" +
        "&language=es" +
        "&sourceServiceType=" + type +
        "&sourceServiceURL=" + baseURL +
        "&sourceRDF=" +
        "&sourceTitle=" +
        "&useSourceRDF=false" +
        "&useRDFMetadata=true" +
        "&createRDF=true" +
        "&initiallySelectedSource=false" +
        "&sourceName=" + this._encodeASCII(baseURL) +
        "&fileID=" + entity[0].fileIdentifier +
        "&viewDetails=true" +
        "&numResultsComponentsValues=0" +
        "&query=" + this._encodeASCII(
            "<Filter>" +
                "<PropertyIsLike>" +
                    "<PropertyName>mne:Entidad/mne:nombreEntidad/mne:NombreEntidad/mne:nombre</PropertyName>" +
                    "<Literal>" + entity[1][0].text + "</Literal>" +
                "</PropertyIsLike>" +
            "</Filter>"
        );

        this.showMessage(_("Solicitando datos al servidor."), true);
        //TODO Gif chulo para esperar
        EzWebAPI.send_get(
            baseURL,
            this,
            function(transport) {
                this.hideMessage();
                this._showDetails(eval(transport.responseText), entity);
            }.bind(this),
            function(){
                this.showError(_("El servidor no responde."));
            }
        );
    },

    _selectFeature: function(feature, element) {
        this._deselectAllFeatures();
        element.addClassName("selected");
        this._showDetails(feature);
    },

    _deselectAllFeatures: function() {
        var features = $("chan_items").childNodes;
        for (var i=0; i<features.length; i++) {
            features[i].removeClassName("selected");
        }
    },

    _showDetails: function(json, entity) {
        $("info").innerHTML = this._decodeASCII(json[1].metadataHTML);

        var srs      = this._decodeASCII(entity[1][4].text);
        var location = this._decodeASCII(entity[1][3].text).split(/,*\s+/);
        if (!location || (location == "")) {
            var sections = $("info").getElementsByClassName("section5v");
            if (sections.length > 0) {
                location = $("info").getElementsByClassName("section5v")[0].innerHTML.split(/,*\s+/);
            }
        }

        location = new OpenLayers.LonLat(location[0], location[1]);
        if (srs && (srs != "")) {
            location = this.transformer.advancedTransform(location, srs, this.transformer.DEFAULT.projCode);
        }

        this.sendLocation(location.lon, location.lat);
        this.sendLocationInfo(location.lon, location.lat, this._decodeASCII(entity[1][0].text));

        var sections = $("info").getElementsByClassName("section3v");
        for (var i=0; i<sections.length; i++) {
            $(sections[i]).observe("click", function(e) {
                e.target.title = _("Send event");
                this.sendText(e.target.innerHTML);
            }.bind(this));
        }

        sections = $("info").getElementsByClassName("section5v");
        for (var i=0; i<sections.length; i++) {
            $(sections[i]).observe("click", function(e) {
                e.target.title = _("Send event");
                this.sendText(e.target.innerHTML);
            }.bind(this));
        }
    },

    _clearDetails: function() {
        $("info").innerHTML = "";
    },

    clearUI: function() {
        this._clearDetails();
        $("list").innerHTML = "";
    },

    showMessage: function(message, permanent) {
        this.messageManager.showMessage(message, conwet.ui.MessageManager.INFO, permanent);
    },

    hideMessage: function() {
        this.messageManager.hideMessage();
    },

    showError: function(message, permanent) {
        this.messageManager.showMessage(message, conwet.ui.MessageManager.ERROR, permanent);
    }

});
