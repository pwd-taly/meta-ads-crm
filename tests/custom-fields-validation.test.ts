import {
  validateCustomFieldName,
  validateFieldType,
  validateFieldConfig,
  validateCustomFieldValue,
} from "@/lib/custom-fields/validation";

describe("Custom Field Validation", () => {
  // ============================================================
  // validateCustomFieldName Tests
  // ============================================================
  describe("validateCustomFieldName", () => {
    describe("valid field names", () => {
      test("accepts simple alphanumeric name", () => {
        expect(validateCustomFieldName("companySize")).toBe(true);
      });

      test("accepts name with underscores", () => {
        expect(validateCustomFieldName("company_size")).toBe(true);
      });

      test("accepts name with numbers", () => {
        expect(validateCustomFieldName("product2024")).toBe(true);
      });

      test("accepts single character name", () => {
        expect(validateCustomFieldName("a")).toBe(true);
      });

      test("accepts name at max length (100 chars)", () => {
        const maxLengthName = "a".repeat(100);
        expect(validateCustomFieldName(maxLengthName)).toBe(true);
      });

      test("accepts name with spaces", () => {
        expect(validateCustomFieldName("Company Size")).toBe(true);
      });

      test("accepts name with mixed case", () => {
        expect(validateCustomFieldName("CompanySize")).toBe(true);
      });

      test("accepts name with hyphens", () => {
        expect(validateCustomFieldName("company-size")).toBe(true);
      });
    });

    describe("invalid field names - empty/whitespace", () => {
      test("rejects empty string", () => {
        expect(validateCustomFieldName("")).toBe(false);
      });

      test("rejects whitespace only", () => {
        expect(validateCustomFieldName("   ")).toBe(false);
      });

      test("rejects tab character", () => {
        expect(validateCustomFieldName("\t")).toBe(false);
      });

      test("rejects newline", () => {
        expect(validateCustomFieldName("\n")).toBe(false);
      });
    });

    describe("invalid field names - length", () => {
      test("rejects name exceeding 100 chars", () => {
        const tooLongName = "a".repeat(101);
        expect(validateCustomFieldName(tooLongName)).toBe(false);
      });

      test("rejects name with 101 characters", () => {
        const tooLongName = "companySize" + "a".repeat(91);
        expect(validateCustomFieldName(tooLongName)).toBe(false);
      });
    });

    describe("invalid field names - reserved names", () => {
      const reservedNames = [
        "id",
        "createdAt",
        "updatedAt",
        "orgId",
        "leadId",
        "campaignId",
        "status",
        "aiScore",
        "scoreReason",
        "lastScoredAt",
        "customValues",
        "firstName",
        "lastName",
        "email",
        "phone",
      ];

      reservedNames.forEach((reserved) => {
        test(`rejects reserved name: ${reserved}`, () => {
          expect(validateCustomFieldName(reserved)).toBe(false);
        });
      });

      test("accepts reserved names with different casing (case-sensitive check)", () => {
        // Reserved name check is case-sensitive, so different casing is allowed
        expect(validateCustomFieldName("ID")).toBe(true);
        expect(validateCustomFieldName("CreatedAt")).toBe(true);
        expect(validateCustomFieldName("AISCORE")).toBe(true);
      });
    });
  });

  // ============================================================
  // validateFieldType Tests
  // ============================================================
  describe("validateFieldType", () => {
    describe("valid field types", () => {
      const validTypes = ["text", "number", "email", "select", "date", "checkbox", "textarea"];

      validTypes.forEach((type) => {
        test(`accepts valid type: ${type}`, () => {
          expect(validateFieldType(type)).toBe(true);
        });
      });
    });

    describe("invalid field types", () => {
      test("rejects empty string", () => {
        expect(validateFieldType("")).toBe(false);
      });

      test("rejects invalid type: string", () => {
        expect(validateFieldType("string")).toBe(false);
      });

      test("rejects invalid type: boolean", () => {
        expect(validateFieldType("boolean")).toBe(false);
      });

      test("rejects invalid type: array", () => {
        expect(validateFieldType("array")).toBe(false);
      });

      test("rejects invalid type: object", () => {
        expect(validateFieldType("object")).toBe(false);
      });

      test("rejects invalid type: datetime", () => {
        expect(validateFieldType("datetime")).toBe(false);
      });

      test("rejects type with different casing (case-sensitive)", () => {
        expect(validateFieldType("Text")).toBe(false);
        expect(validateFieldType("TEXT")).toBe(false);
        expect(validateFieldType("Select")).toBe(false);
      });

      test("rejects type with whitespace", () => {
        expect(validateFieldType(" text")).toBe(false);
        expect(validateFieldType("text ")).toBe(false);
      });
    });
  });

  // ============================================================
  // validateFieldConfig Tests
  // ============================================================
  describe("validateFieldConfig", () => {
    describe("select type configuration", () => {
      test("accepts select with valid options array", () => {
        const config = { options: ["option1", "option2", "option3"] };
        expect(validateFieldConfig("select", config)).toBe(true);
      });

      test("accepts select with single option", () => {
        const config = { options: ["only-option"] };
        expect(validateFieldConfig("select", config)).toBe(true);
      });

      test("accepts select with numeric options", () => {
        const config = { options: [1, 2, 3] };
        expect(validateFieldConfig("select", config)).toBe(true);
      });

      test("rejects select without options", () => {
        const config = {};
        expect(validateFieldConfig("select", config)).toBe(false);
      });

      test("rejects select with empty options array", () => {
        const config = { options: [] };
        expect(validateFieldConfig("select", config)).toBe(false);
      });

      test("rejects select with null options", () => {
        const config = { options: null };
        expect(validateFieldConfig("select", config)).toBe(false);
      });

      test("rejects select with options not as array", () => {
        const config = { options: "option1,option2" };
        expect(validateFieldConfig("select", config)).toBe(false);
      });

      test("rejects select with undefined config", () => {
        expect(validateFieldConfig("select", undefined)).toBe(false);
      });

      test("rejects select with null config", () => {
        expect(validateFieldConfig("select", null)).toBe(false);
      });
    });

    describe("number type configuration", () => {
      test("accepts number with no config", () => {
        expect(validateFieldConfig("number", null)).toBe(true);
        expect(validateFieldConfig("number", {})).toBe(true);
      });

      test("accepts number with valid min/max", () => {
        const config = { min: 0, max: 100 };
        expect(validateFieldConfig("number", config)).toBe(true);
      });

      test("accepts number with equal min/max", () => {
        const config = { min: 50, max: 50 };
        expect(validateFieldConfig("number", config)).toBe(true);
      });

      test("accepts number with only min", () => {
        const config = { min: 10 };
        expect(validateFieldConfig("number", config)).toBe(true);
      });

      test("accepts number with only max", () => {
        const config = { max: 100 };
        expect(validateFieldConfig("number", config)).toBe(true);
      });

      test("accepts number with negative min/max", () => {
        const config = { min: -100, max: 100 };
        expect(validateFieldConfig("number", config)).toBe(true);
      });

      test("rejects number with min > max", () => {
        const config = { min: 100, max: 50 };
        expect(validateFieldConfig("number", config)).toBe(false);
      });

      test("accepts number with non-numeric min/max values (ignores invalid types)", () => {
        const config = { min: "10", max: "100" };
        // Should return true because string comparison is skipped
        expect(validateFieldConfig("number", config)).toBe(true);
      });
    });

    describe("other types configuration", () => {
      test("accepts text with any config", () => {
        expect(validateFieldConfig("text", {})).toBe(true);
        expect(validateFieldConfig("text", { maxLength: 255 })).toBe(true);
      });

      test("accepts email with any config", () => {
        expect(validateFieldConfig("email", {})).toBe(true);
        expect(validateFieldConfig("email", null)).toBe(true);
      });

      test("accepts date with any config", () => {
        expect(validateFieldConfig("date", {})).toBe(true);
        expect(validateFieldConfig("date", { format: "YYYY-MM-DD" })).toBe(true);
      });

      test("accepts checkbox with any config", () => {
        expect(validateFieldConfig("checkbox", {})).toBe(true);
        expect(validateFieldConfig("checkbox", null)).toBe(true);
      });

      test("accepts textarea with any config", () => {
        expect(validateFieldConfig("textarea", {})).toBe(true);
        expect(validateFieldConfig("textarea", { maxLength: 10000 })).toBe(true);
      });
    });
  });

  // ============================================================
  // validateCustomFieldValue Tests
  // ============================================================
  describe("validateCustomFieldValue", () => {
    describe("null/undefined handling (optional fields)", () => {
      test("accepts null for any type", () => {
        expect(validateCustomFieldValue("text", null)).toBe(true);
        expect(validateCustomFieldValue("number", null)).toBe(true);
        expect(validateCustomFieldValue("email", null)).toBe(true);
        expect(validateCustomFieldValue("select", null)).toBe(true);
        expect(validateCustomFieldValue("date", null)).toBe(true);
        expect(validateCustomFieldValue("checkbox", null)).toBe(true);
        expect(validateCustomFieldValue("textarea", null)).toBe(true);
      });

      test("accepts undefined for any type", () => {
        expect(validateCustomFieldValue("text", undefined)).toBe(true);
        expect(validateCustomFieldValue("number", undefined)).toBe(true);
        expect(validateCustomFieldValue("email", undefined)).toBe(true);
        expect(validateCustomFieldValue("select", undefined)).toBe(true);
        expect(validateCustomFieldValue("date", undefined)).toBe(true);
        expect(validateCustomFieldValue("checkbox", undefined)).toBe(true);
        expect(validateCustomFieldValue("textarea", undefined)).toBe(true);
      });
    });

    describe("text type validation", () => {
      test("accepts valid text", () => {
        expect(validateCustomFieldValue("text", "hello")).toBe(true);
        expect(validateCustomFieldValue("text", "Hello World")).toBe(true);
        expect(validateCustomFieldValue("text", "123")).toBe(true);
      });

      test("accepts empty string", () => {
        expect(validateCustomFieldValue("text", "")).toBe(true);
      });

      test("accepts text at max length (255 chars)", () => {
        const maxText = "a".repeat(255);
        expect(validateCustomFieldValue("text", maxText)).toBe(true);
      });

      test("rejects text exceeding 255 chars", () => {
        const tooLongText = "a".repeat(256);
        expect(validateCustomFieldValue("text", tooLongText)).toBe(false);
      });

      test("rejects non-string values", () => {
        expect(validateCustomFieldValue("text", 123)).toBe(false);
        expect(validateCustomFieldValue("text", true)).toBe(false);
        expect(validateCustomFieldValue("text", {})).toBe(false);
        expect(validateCustomFieldValue("text", [])).toBe(false);
      });

      test("accepts text with special characters", () => {
        expect(validateCustomFieldValue("text", "!@#$%^&*()")).toBe(true);
        expect(validateCustomFieldValue("text", "café")).toBe(true);
        expect(validateCustomFieldValue("text", "新年快乐")).toBe(true);
      });
    });

    describe("number type validation", () => {
      test("accepts valid numbers", () => {
        expect(validateCustomFieldValue("number", 0)).toBe(true);
        expect(validateCustomFieldValue("number", 42)).toBe(true);
        expect(validateCustomFieldValue("number", -42)).toBe(true);
        expect(validateCustomFieldValue("number", 3.14)).toBe(true);
        expect(validateCustomFieldValue("number", -3.14)).toBe(true);
      });

      test("rejects NaN", () => {
        expect(validateCustomFieldValue("number", NaN)).toBe(false);
      });

      test("rejects Infinity", () => {
        expect(validateCustomFieldValue("number", Infinity)).toBe(false);
        expect(validateCustomFieldValue("number", -Infinity)).toBe(false);
      });

      test("rejects non-number types", () => {
        expect(validateCustomFieldValue("number", "42")).toBe(false);
        expect(validateCustomFieldValue("number", true)).toBe(false);
        expect(validateCustomFieldValue("number", {})).toBe(false);
      });

      test("accepts very large numbers", () => {
        expect(validateCustomFieldValue("number", 1e10)).toBe(true);
        expect(validateCustomFieldValue("number", -1e10)).toBe(true);
      });
    });

    describe("email type validation", () => {
      test("accepts valid email addresses", () => {
        expect(validateCustomFieldValue("email", "test@example.com")).toBe(true);
        expect(validateCustomFieldValue("email", "user.name@example.com")).toBe(true);
        expect(validateCustomFieldValue("email", "user+tag@example.co.uk")).toBe(true);
        expect(validateCustomFieldValue("email", "test_123@test-domain.com")).toBe(true);
      });

      test("accepts edge case valid emails", () => {
        expect(validateCustomFieldValue("email", "a@b.co")).toBe(true);
        expect(validateCustomFieldValue("email", "test%123@example.com")).toBe(true);
      });

      test("rejects invalid email addresses", () => {
        expect(validateCustomFieldValue("email", "notanemail")).toBe(false);
        expect(validateCustomFieldValue("email", "@example.com")).toBe(false);
        expect(validateCustomFieldValue("email", "user@")).toBe(false);
        expect(validateCustomFieldValue("email", "user@.com")).toBe(false);
        expect(validateCustomFieldValue("email", "user..name@example.com")).toBe(false);
        expect(validateCustomFieldValue("email", "user@example")).toBe(false);
      });

      test("rejects non-string emails", () => {
        expect(validateCustomFieldValue("email", 123)).toBe(false);
        expect(validateCustomFieldValue("email", true)).toBe(false);
        expect(validateCustomFieldValue("email", {})).toBe(false);
      });

      test("rejects emails with spaces", () => {
        expect(validateCustomFieldValue("email", "user @example.com")).toBe(false);
        expect(validateCustomFieldValue("email", "user@ example.com")).toBe(false);
      });
    });

    describe("date type validation", () => {
      test("accepts valid dates in YYYY-MM-DD format", () => {
        expect(validateCustomFieldValue("date", "2024-01-15")).toBe(true);
        expect(validateCustomFieldValue("date", "2000-12-31")).toBe(true);
        expect(validateCustomFieldValue("date", "2025-02-28")).toBe(true);
      });

      test("accepts leap year dates", () => {
        expect(validateCustomFieldValue("date", "2024-02-29")).toBe(true);
        expect(validateCustomFieldValue("date", "2000-02-29")).toBe(true);
      });

      test("rejects invalid date formats", () => {
        expect(validateCustomFieldValue("date", "2024/01/15")).toBe(false);
        expect(validateCustomFieldValue("date", "01-15-2024")).toBe(false);
        expect(validateCustomFieldValue("date", "2024-1-15")).toBe(false);
        expect(validateCustomFieldValue("date", "2024-01-5")).toBe(false);
      });

      test("rejects invalid dates", () => {
        expect(validateCustomFieldValue("date", "2024-02-30")).toBe(false);
        expect(validateCustomFieldValue("date", "2024-13-01")).toBe(false);
        expect(validateCustomFieldValue("date", "2024-00-01")).toBe(false);
        expect(validateCustomFieldValue("date", "2023-02-29")).toBe(false); // Not a leap year
      });

      test("rejects non-leap-year feb 29", () => {
        expect(validateCustomFieldValue("date", "2023-02-29")).toBe(false);
        expect(validateCustomFieldValue("date", "2100-02-29")).toBe(false);
      });

      test("rejects non-string dates", () => {
        expect(validateCustomFieldValue("date", 20240115)).toBe(false);
        expect(validateCustomFieldValue("date", true)).toBe(false);
        expect(validateCustomFieldValue("date", new Date())).toBe(false);
      });

      test("rejects incomplete dates", () => {
        expect(validateCustomFieldValue("date", "2024-01")).toBe(false);
        expect(validateCustomFieldValue("date", "2024")).toBe(false);
      });

      test("rejects dates with extra content", () => {
        expect(validateCustomFieldValue("date", "2024-01-15T10:00:00Z")).toBe(false);
        expect(validateCustomFieldValue("date", "2024-01-15 ")).toBe(false);
      });
    });

    describe("checkbox type validation", () => {
      test("accepts true", () => {
        expect(validateCustomFieldValue("checkbox", true)).toBe(true);
      });

      test("accepts false", () => {
        expect(validateCustomFieldValue("checkbox", false)).toBe(true);
      });

      test("rejects non-boolean values", () => {
        expect(validateCustomFieldValue("checkbox", 1)).toBe(false);
        expect(validateCustomFieldValue("checkbox", 0)).toBe(false);
        expect(validateCustomFieldValue("checkbox", "true")).toBe(false);
        expect(validateCustomFieldValue("checkbox", "false")).toBe(false);
        expect(validateCustomFieldValue("checkbox", {})).toBe(false);
      });
    });

    describe("textarea type validation", () => {
      test("accepts valid textarea content", () => {
        expect(validateCustomFieldValue("textarea", "Short content")).toBe(true);
        expect(validateCustomFieldValue("textarea", "Multiple\nLines\nof\nContent")).toBe(true);
      });

      test("accepts empty string", () => {
        expect(validateCustomFieldValue("textarea", "")).toBe(true);
      });

      test("accepts textarea at max length (10000 chars)", () => {
        const maxText = "a".repeat(10000);
        expect(validateCustomFieldValue("textarea", maxText)).toBe(true);
      });

      test("rejects textarea exceeding 10000 chars", () => {
        const tooLongText = "a".repeat(10001);
        expect(validateCustomFieldValue("textarea", tooLongText)).toBe(false);
      });

      test("rejects non-string values", () => {
        expect(validateCustomFieldValue("textarea", 123)).toBe(false);
        expect(validateCustomFieldValue("textarea", true)).toBe(false);
        expect(validateCustomFieldValue("textarea", {})).toBe(false);
      });

      test("accepts content with special characters", () => {
        expect(validateCustomFieldValue("textarea", "!@#$%^&*()\nMultiple lines")).toBe(true);
        expect(validateCustomFieldValue("textarea", "Line 1\nLine 2\nLine 3")).toBe(true);
      });
    });

    describe("select type validation", () => {
      const selectConfig = { options: ["red", "green", "blue"] };

      test("accepts value matching an option", () => {
        expect(validateCustomFieldValue("select", "red", selectConfig)).toBe(true);
        expect(validateCustomFieldValue("select", "green", selectConfig)).toBe(true);
        expect(validateCustomFieldValue("select", "blue", selectConfig)).toBe(true);
      });

      test("rejects value not in options", () => {
        expect(validateCustomFieldValue("select", "yellow", selectConfig)).toBe(false);
      });

      test("accepts numeric options", () => {
        const numericConfig = { options: [1, 2, 3] };
        expect(validateCustomFieldValue("select", 1, numericConfig)).toBe(true);
        expect(validateCustomFieldValue("select", 2, numericConfig)).toBe(true);
      });

      test("rejects numeric value when options are strings", () => {
        expect(validateCustomFieldValue("select", 1, selectConfig)).toBe(false);
      });

      test("rejects string value when options are numeric", () => {
        const numericConfig = { options: [1, 2, 3] };
        expect(validateCustomFieldValue("select", "1", numericConfig)).toBe(false);
      });

      test("rejects select without config", () => {
        expect(validateCustomFieldValue("select", "red")).toBe(false);
      });

      test("rejects select with invalid config", () => {
        expect(validateCustomFieldValue("select", "red", { options: null })).toBe(false);
        expect(validateCustomFieldValue("select", "red", {})).toBe(false);
      });

      test("accepts mixed type options", () => {
        const mixedConfig = { options: ["text", 123, true] };
        expect(validateCustomFieldValue("select", "text", mixedConfig)).toBe(true);
        expect(validateCustomFieldValue("select", 123, mixedConfig)).toBe(true);
        expect(validateCustomFieldValue("select", true, mixedConfig)).toBe(true);
      });
    });

    describe("edge cases and special scenarios", () => {
      test("handles boolean false correctly (distinct from null/undefined)", () => {
        expect(validateCustomFieldValue("checkbox", false)).toBe(true);
        expect(validateCustomFieldValue("text", false)).toBe(false);
      });

      test("handles zero correctly for numbers", () => {
        expect(validateCustomFieldValue("number", 0)).toBe(true);
      });

      test("handles empty string correctly for text", () => {
        expect(validateCustomFieldValue("text", "")).toBe(true);
      });

      test("validates with all types in combination", () => {
        const types = ["text", "number", "email", "select", "date", "checkbox", "textarea"];
        types.forEach((type) => {
          // All should accept null
          expect(validateCustomFieldValue(type, null)).toBe(true);
        });
      });
    });
  });
});
