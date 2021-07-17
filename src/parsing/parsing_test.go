package parsing

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMarkdown(t *testing.T) {
	t.Run("fenced code blocks", func(t *testing.T) {
		t.Run("multiple lines", func(t *testing.T) {
			html := ParsePostInput("```\nmultiple lines\n\tof code\n```", RealMarkdown)
			t.Log(html)
			assert.Equal(t, 1, strings.Count(html, "<pre"))
			assert.Contains(t, html, `class="hmn-code"`)
			assert.Contains(t, html, "multiple lines\n\tof code")
		})
		t.Run("multiple lines with language", func(t *testing.T) {
			html := ParsePostInput("```go\nfunc main() {\n\tfmt.Println(\"Hello, world!\")\n}\n```", RealMarkdown)
			t.Log(html)
			assert.Equal(t, 1, strings.Count(html, "<pre"))
			assert.Contains(t, html, `class="hmn-code"`)
			assert.Contains(t, html, "Println")
			assert.Contains(t, html, "Hello, world!")
		})
	})
}

func TestBBCode(t *testing.T) {
	t.Run("[code]", func(t *testing.T) {
		t.Run("one line", func(t *testing.T) {
			html := ParsePostInput("[code]Just some code, you know?[/code]", RealMarkdown)
			t.Log(html)
			assert.Equal(t, 1, strings.Count(html, "<pre"))
			assert.Contains(t, html, `class="hmn-code"`)
			assert.Contains(t, html, "Just some code, you know?")
		})
		t.Run("multiline", func(t *testing.T) {
			bbcode := `[code]
Multiline code
	with an indent
[/code]`
			html := ParsePostInput(bbcode, RealMarkdown)
			t.Log(html)
			assert.Equal(t, 1, strings.Count(html, "<pre"))
			assert.Contains(t, html, `class="hmn-code"`)
			assert.Contains(t, html, "Multiline code\n\twith an indent")
			assert.NotContains(t, html, "<br")
		})
		t.Run("multiline with language", func(t *testing.T) {
			bbcode := `[code language=go]
func main() {
	fmt.Println("Hello, world!")
}
[/code]`
			html := ParsePostInput(bbcode, RealMarkdown)
			t.Log(html)
			assert.Equal(t, 1, strings.Count(html, "<pre"))
			assert.Contains(t, html, "Println")
			assert.Contains(t, html, "Hello, world!")
		})
	})
}

func BenchmarkSharlock(b *testing.B) {
	for i := 0; i < b.N; i++ {
		ParsePostInput(sharlock, RealMarkdown)
	}
}
