const fs = require("fs");
const csvParse = require("csv-parse");
const csvStringify = require("csv-stringify/sync");

const missingFacilities = [];
const missingFacilityFile = "./missingfacilityzips.csv";

fs.createReadStream(missingFacilityFile)
  .pipe(csvParse.parse({ delimiter: "," }))
  .on("data", (r) => {
    missingFacilities.push(r);
  })
  .on("end", () => {
    lookupMissingScfs();
    lookupMissingDdus();
  });

const lookupMissingScfs = () => {
  const facilities = [];
  const facilitiesFile = "./FACILITY.csv";
  fs.createReadStream(facilitiesFile)
    .pipe(csvParse.parse({ delimiter: "," }))
    .on("data", (r) => {
      facilities.push(r);
    })
    .on("end", () => {
      const scfs = [];
      const scfFile = "./SCF_3Digit.csv";
      fs.createReadStream(scfFile)
        .pipe(csvParse.parse({ delimiter: "," }))
        .on("data", (r) => {
          scfs.push(r);
        })
        .on("end", () => {
          const missingScfs = [];
          missingFacilities.forEach((missingFacility) => {
            const facilityType = missingFacility[1];
            if (facilityType !== "scf") return;

            const zipCodeServed = missingFacility[0];
            const matchingScf = scfs.find((scf) => {
              const zipCodePrefix = scf[0].trim();
              return zipCodeServed.substr(0, 3) === zipCodePrefix;
            });

            const scfName = matchingScf[2].trim();
            const scfCityState = scfName.substr(0, scfName.length - 4);
            const scfCity = scfCityState.substr(0, scfCityState.length - 3);
            const scfState = scfCityState.substr(scfCity.length + 1, 2);

            const facility = facilities.find(
              (facility) =>
                facility[9].toUpperCase() === scfCity.toUpperCase() &&
                facility[10].toUpperCase() === scfState.toUpperCase() &&
                facility[7] === "Main Post Office"
            );

            if (!facility) return;

            // const facilityAddress = facility[8];
            // const facilityCity = facility[9];
            // const facilityState = facility[10];
            const facilityZip = `${facility[4].substr(
              0,
              5
            )}-${facility[4].substr(5, 4)}`;

            missingFacility[2] = facilityZip;
            missingScfs.push(missingFacility);
          });

          const output = csvStringify.stringify(missingScfs);
          fs.writeFile("./missingSCFs_updated.csv", output, (err) => {
            if (err) {
              console.error(err);
              return;
            }
          });
        });
    });
};

const lookupMissingDdus = () => {
  const ddus = [];
  const dduFile = "./CompleteListOfDDUs.csv";
  fs.createReadStream(dduFile)
    .pipe(csvParse.parse({ delimiter: "," }))
    .on("data", (r) => {
      ddus.push(r);
    })
    .on("end", () => {
      const missingDdus = [];
      missingFacilities.forEach((missingFacility) => {
        const facilityType = missingFacility[1];
        if (facilityType !== "ddu") return;

        const zipCodeServed = missingFacility[0];
        const matchingDdu = ddus.find((ddu) => ddu[0] === zipCodeServed);

        if (!matchingDdu) return;

        let facilityZip = matchingDdu[6];
        if (facilityZip === "-") facilityZip = "";

        missingFacility[2] = facilityZip;
        missingDdus.push(missingFacility);
      });

      const output = csvStringify.stringify(missingDdus);
      fs.writeFile("./missingDDUs_updated.csv", output, (err) => {
        if (err) {
          console.error(err);
          return;
        }
      });
    });
};
