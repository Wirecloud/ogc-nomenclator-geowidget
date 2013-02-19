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

conwet.parser.Parser = Class.create({

    initialize: function() {
    },

    parse: function(xml) {

        var entities = [];

        var features = xml.getElementsByTagNameNS("*", "Entidad");

        for (var i=0; i<features.length; i++) {
            var feature = features[i];

            var nameEntity = feature.getElementsByTagNameNS("*", "nombreEntidad")[0];
            var name = nameEntity.getElementsByTagNameNS("*", "nombre");

            if (name.length > 0) {
                name = name[0].textContent;
            }
            else {
                name = nameEntity.textContent;
            }

            entities.push({
                "name": name
            });
        }

        return entities;
    }

});

