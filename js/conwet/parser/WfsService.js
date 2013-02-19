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

use("conwet.parser");

conwet.parser.WfsService = Class.create({

    initialize: function(xml) {
        this.xml = xml;

        this.prefixNS = null;
        this.uriNS    = null;
        this.mne      = false;

        var featureTypes = xml.getElementsByTagNameNS("*", "FeatureType");

        for (var i=0; i<featureTypes.length; i++) {
            var featureType = featureTypes[i];
            var name = featureType.getElementsByTagNameNS("*", "Name")[0];

            if (!name) {
                continue;
            }

            var ns = name.getTextContent().split(":");
            if ((ns.length > 1) && (ns[1] == "Entidad")) {
                this.prefixNS = ns[0];
                this.uriNS    = featureType.getAttribute("xmlns:" + this.prefixNS);
                this.mne      = true;
            }
        }

    },

    getPrefixNS: function() {
        return this.prefixNS;
    },

    getUriNS: function() {
        return this.uriNS;
    },

    isMNE: function() {
        return this.mne;
    }

});
