import React, { useState } from "react";
import {
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Alert,
} from "@mui/material";
import { fieldLabel } from "./workflowExtras.js";
export default function InputForm({ text, onChange }) {
  const [advanced, setAdvanced] = useState(false);
  let input;
  try {
    input = JSON.parse(text);
  } catch {}
  const simple =
    input &&
    typeof input === "object" &&
    !Array.isArray(input) &&
    Object.values(input).every((v) =>
      ["string", "number", "boolean"].includes(typeof v),
    );
  return (
    <div className="input-form">
      <div className="input-mode">
        <strong>{advanced ? "高级输入" : "填写本次任务"}</strong>
        <Button size="small" onClick={() => setAdvanced(!advanced)}>
          {advanced ? "切换表单" : "高级 JSON"}
        </Button>
      </div>
      {advanced || !simple ? (
        <>
          <TextField
            label="输入 JSON"
            multiline
            minRows={7}
            fullWidth
            value={text}
            onChange={(e) => onChange(e.target.value)}
          />
          {!simple && !advanced && (
            <Alert severity="info">
              当前输入包含嵌套对象或格式错误，请使用 JSON 编辑。
            </Alert>
          )}
        </>
      ) : (
        Object.entries(input).map(([key, value]) =>
          typeof value === "boolean" ? (
            <FormControlLabel
              key={key}
              label={fieldLabel(key)}
              control={
                <Switch
                  checked={value}
                  onChange={(e) =>
                    onChange(
                      JSON.stringify(
                        { ...input, [key]: e.target.checked },
                        null,
                        2,
                      ),
                    )
                  }
                />
              }
            />
          ) : (
            <TextField
              key={key}
              label={fieldLabel(key)}
              fullWidth
              multiline={typeof value === "string"}
              minRows={typeof value === "string" ? 3 : undefined}
              type={typeof value === "number" ? "number" : "text"}
              value={value}
              onChange={(e) =>
                onChange(
                  JSON.stringify(
                    {
                      ...input,
                      [key]:
                        typeof value === "number"
                          ? Number(e.target.value)
                          : e.target.value,
                    },
                    null,
                    2,
                  ),
                )
              }
            />
          ),
        )
      )}
    </div>
  );
}
