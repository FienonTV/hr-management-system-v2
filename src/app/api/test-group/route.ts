import { NextResponse } from "next/server";
import { generateDocumentGroup } from "@/lib/actions/documentTemplates";

export async function POST() {
  try {
    const result = await generateDocumentGroup("cms01we990000k86644h8zsys", {
      templateIds: ["cms1nyq8x00005w66acu3c4ja"],
      customVariables: {
        "cms1nyq8x00005w66acu3c4ja": { zweck: "Wohnungsgeber", unterschrifttext: "Simon Widanski" },
      },
      title: "Arbeitsbescheinigung E2E",
      companyName: "Schendel GmbH",
      signingCity: "Moers",
      pageNumbers: true,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
