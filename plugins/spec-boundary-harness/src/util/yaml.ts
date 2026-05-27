import YAML from "yaml";

export function toYaml(data: unknown): string {
  return YAML.stringify(data, { lineWidth: 0 });
}

export function fromYaml<T = unknown>(text: string): T {
  return YAML.parse(text) as T;
}
