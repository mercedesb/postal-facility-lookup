const fs = require("fs");
const csvParse = require("csv-parse");
const csvStringify = require("csv-stringify/sync");

const missingFacilities = [];
const missingFacilityFile = "./missingfacilityzips.csv";

const writeToFile = (filepath, data) => {
  const output = csvStringify.stringify(data);
  fs.writeFile(filepath, output, (err) => {
    if (err) {
      console.error(err);
      return;
    }
  });
};

fs.createReadStream(missingFacilityFile)
  .pipe(csvParse.parse())
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
    .pipe(csvParse.parse())
    .on("data", (r) => {
      facilities.push(r);
    })
    .on("end", () => {
      const scfs = [];
      const scfFile = "./SCF_3Digit.csv";
      fs.createReadStream(scfFile)
        .pipe(csvParse.parse())
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

            if (!facility) {
              missingScfs.push(missingFacility);
              return;
            }

            const facilityZip = `${facility[4].substr(
              0,
              5
            )}-${facility[4].substr(5, 4)}`;

            missingFacility[2] = facilityZip;
            missingScfs.push(missingFacility);
          });

          writeToFile("./missingSCFs_updated.csv", missingScfs);
        });
    });
};

const lookupMissingDdus = () => {
  const ddus = [];
  const dduFile = "./CompleteListOfDDUs.csv";
  fs.createReadStream(dduFile)
    .pipe(csvParse.parse())
    .on("data", (r) => {
      ddus.push(r);
    })
    .on("end", () => {
      const destinationFacilities = [];
      const dduFile = "./DMM_L606.csv";
      fs.createReadStream(dduFile)
        .pipe(csvParse.parse())
        .on("data", (r) => {
          destinationFacilities.push(r);
        })
        .on("end", () => {
          const missingDdus = [];
          missingFacilities.forEach((missingFacility) => {
            const facilityType = missingFacility[1];
            if (facilityType !== "ddu") return;

            const zipCodeServed = missingFacility[0];
            const matchingDdu = ddus.find((ddu) => ddu[0] === zipCodeServed);
            let matchingDestination;
            if (!matchingDdu) {
              matchingDestination = destinationFacilities.find((facility) => {
                const facilityZipServed = facility[0];
                const explicitMatch = facilityZipServed.includes(zipCodeServed);
                let implicitMatch = false;
                if (!explicitMatch && facilityZipServed.includes("-")) {
                  const zipCodes = facilityZipServed.split(",");
                  const rangeOfZipCodes = zipCodes.filter((z) =>
                    z.includes("-")
                  );
                  const parsedZipCodeServed = parseInt(zipCodeServed);

                  rangeOfZipCodes.forEach((range) => {
                    const minMaxZipCodes = range.split("-");
                    const min = parseInt(minMaxZipCodes[0]);
                    const max = parseInt(minMaxZipCodes[1]);
                    implicitMatch =
                      implicitMatch ||
                      (parsedZipCodeServed >= min &&
                        parsedZipCodeServed <= max);
                  });
                }
                return explicitMatch || implicitMatch;
              });
            }

            if (!matchingDdu && !matchingDestination) return;

            let facilityZip = matchingDdu[6];
            if (facilityZip === "-") facilityZip = "";

            if (!facilityZip && matchingDestination) {
              facilityZip = matchingDestination[1].substring(
                matchingDestination[1].length - 5
              );
            }

            missingFacility[2] = facilityZip;
            missingDdus.push(missingFacility);
          });

          writeToFile("./missingDDUs_updated.csv", missingDdus);
        });
    });
};
