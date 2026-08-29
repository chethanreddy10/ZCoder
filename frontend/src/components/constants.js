export const COMPILER_IDS = {
  cpp: "g++-15",
  java: "openjdk-25",
  python: "python-3.14",
  typescript: "typescript-deno",
};

export const LANGUAGE_DISPLAY_NAMES = {
  cpp: "C++",
  java: "Java",
  python: "Python",
  typescript: "TypeScript",
};

export const CODE_SNIPPETS = {
  python: `print("Hello World !")`,
  typescript: `console.log("Hello World!");`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    cout << "Hello World!" << endl;\n    return 0;\n}`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n    }\n}`
};
