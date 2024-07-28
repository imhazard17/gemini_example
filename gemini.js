const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Console } = require("console");
const fs = require("fs")
require('dotenv').config()
const mime = require('mime-types')

// object of prompts
const prompts = {
    "image": `Please provide type of report uploaded, technique, diagnosis details, findings, clinical indication and
    impression for this medical report also also provide medical report name for each of the files which are images only. Reply with only JSON in the JSON format specified below: {"Findings":"Findings of type
    Text","ClinicalIndication":"Clinical Indication of type Text","TypeOfReportUploaded":"Type Of Report
    Uploaded of type Text","MedicalReportName":"Medical Report Name of type
    Text","Diagnosis":"Diagnosis of type Text","Impression":"Impression of type
    Text","Technique":"Technique of type Text"}`,

    "pdf": `Please provide medical report name and provide prognosis details for each of the files which are pdfs only. Reply with only JSON in the JSON format specified below: {"Prognosis":"Prognosis of type
    Text","MedicalReportName":"Medical Report Name of type Text"}`,

    "treatment": `Please provide different treatment details with brief description and associated cost for all pdf and image files uploaded in the previous prompts in dollars and if its a range then return the average cost Reply
    with only JSON in the JSON format specified below:
    {"TreatmentDetails":[{"TreatmentDescription":"Treatment Description of type
    Text","TypeOfTreatment":"TypeOfTreatment of type Text","Cost":"Cost of type Number"}]}`,

    "summary": `Please provide a clinical summary for all pdf and image files in previous prompts. Reply with only JSON in the JSON format
    specified below: {"Summary":"Summary of type Text"}`
}

// referred from the docs: https://ai.google.dev/gemini-api/docs/get-started/tutorial?lang=node#generate-text-from-text-and-image-input
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType
        },
    };
}

async function run() {
    // init model and chat object
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const chat = model.startChat()

    // make list of GoogleGenerativeAI.Part objects to upload files with prompts
    const fileParts = []
    const files = fs.readdirSync('./docs')
    files.forEach(file => fileParts.push(fileToGenerativePart(`docs/${file}`, mime.lookup(file))))

    // upload only images for image prompt and store response in docWiseReport
    let result = await chat.sendMessage([prompts['image'], ...fileParts.filter(part => part.inlineData.mimeType.startsWith('image'))]);
    let response = await result.response;
    let docWiseReport = response.text();

    // upload only pdf for pdf prompt and concatinate its response to docWiseReport so it contain combined response of image and pdf prompt
    result = await chat.sendMessage([prompts['pdf'], ...fileParts.filter(part => part.inlineData.mimeType.endsWith('pdf'))]);
    response = await result.response;

    docWiseReport += response.text()
    console.log('============================DOCUMENT WISE REPORTS===============================')
    console.log(docWiseReport);
    console.log('----------------------------------------------------------------------------------------')
    console.log('')

    // upload all files (both pdfs and images) to treatment and summary prompts
    result = await chat.sendMessage([prompts['treatment'], ...fileParts]);
    response = await result.response;
    const treatmentDetails = response.text();
    console.log('===========================TREATMENT DETAILS===========================')
    console.log(treatmentDetails);
    console.log('----------------------------------------------------------------------------------------')
    console.log('')

    result = await chat.sendMessage([prompts['summary'], ...fileParts]);
    response = await result.response;
    const summary = response.text();
    console.log('========================SUMMARY=============================')
    console.log(summary);
}

run();
