let fs = require("fs")
let csv = require("fast-csv")
let dms2dec = require("dms2dec")
let GeoJSON = require("geojson")

let input = fs.createReadStream("raw/AQMN_EPD_20171107.csv", {
    encoding: "ucs2"
})

let simpleJsonData = []
let geoJsonTransformer = (data) => {
    return GeoJSON.parse(data, { Point: ["coordinates.latitude", "coordinates.longitude"] })
}
let keyValueTransformer = (data) => {
    let stations = {}
    data.forEach((location) => {
        stations[location.eng_name] = {
            coordinates: location.coordinates
        }
    })

    return stations
}
let csvStream = csv.fromStream(input, {delimiter: "\t", headers: true})

csvStream
    .transform((data) => {
        let dmsLat = data["LATITUDE"].split("-").map(Number)
        let dmsLong = data["LONGITUDE"].split("-").map(Number)
        let coordinates = dms2dec(dmsLat, "N", dmsLong, "E")

        return {
            ch_name: data["中文名稱"].split("空氣質素監測站")[0],
            eng_name: data["ENGLISH NAME"].split(" Air Quality Monitoring Station")[0],
            coordinates: {
                longitude: coordinates[1],
                latitude: coordinates[0]
            }
        }
    })
    .on("data", (data) => {
        simpleJsonData.push(data)
    })
    .on("end", () => {
        fs.writeFile("data/hk-stations.json", JSON.stringify(simpleJsonData), (err) => {
            if (err) console.error("Failed to write into data/hk-stations.json")
            console.log("Generated data/hk-stations.json")
        })

        let geojsonData = geoJsonTransformer(simpleJsonData)
        fs.writeFile("data/hk-stations.geojson", JSON.stringify(geojsonData), (err) => {
            if (err) console.error("Failed to write into data/hk-stations.geojson")
            console.log("Generated data/hk-stations.geojson")
        })

        let keyValueData = keyValueTransformer(simpleJsonData)
        fs.writeFile("data/hk-stations-key_value.json", JSON.stringify(keyValueData), (err) => {
            if (err) console.error("Failed to write into data/hk-stations-key_value.json")
            console.log(keyValueData)
            console.log("Generated data/hk-stations-key_value.json")
        })
    })