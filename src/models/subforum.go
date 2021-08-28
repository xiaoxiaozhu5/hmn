package models

import (
	"context"

	"git.handmade.network/hmn/hmn/src/db"
	"git.handmade.network/hmn/hmn/src/oops"
	"github.com/jackc/pgx/v4/pgxpool"
)

type Subforum struct {
	ID int `db:"id"`

	ParentID  *int `db:"parent_id"`
	ProjectID int  `db:"project_id"`

	Slug  string `db:"slug"`
	Name  string `db:"name"`
	Blurb string `db:"blurb"`
}

type SubforumTree map[int]*SubforumTreeNode

type SubforumTreeNode struct {
	Subforum
	Parent   *SubforumTreeNode
	Children []*SubforumTreeNode
}

func (node *SubforumTreeNode) GetLineage() []*Subforum {
	current := node
	length := 0
	for current != nil {
		current = current.Parent
		length += 1
	}
	result := make([]*Subforum, length)
	current = node
	for i := length - 1; i >= 0; i -= 1 {
		result[i] = &current.Subforum
		current = current.Parent
	}
	return result
}

func GetFullSubforumTree(ctx context.Context, conn *pgxpool.Pool) SubforumTree {
	type subforumRow struct {
		Subforum Subforum `db:"sf"`
	}
	rows, err := db.Query(ctx, conn, subforumRow{},
		`
		SELECT $columns
		FROM
			handmade_subforum as sf
		ORDER BY id ASC
		`,
	)
	if err != nil {
		panic(oops.New(err, "failed to fetch subforum tree"))
	}

	rowsSlice := rows.ToSlice()
	sfTreeMap := make(map[int]*SubforumTreeNode, len(rowsSlice))
	for _, row := range rowsSlice {
		sf := row.(*subforumRow).Subforum
		sfTreeMap[sf.ID] = &SubforumTreeNode{Subforum: sf}
	}

	for _, node := range sfTreeMap {
		if node.ParentID != nil {
			node.Parent = sfTreeMap[*node.ParentID]
		}
	}

	for _, row := range rowsSlice {
		// NOTE(asaf): Doing this in a separate loop over rowsSlice to ensure that Children are in db order.
		cat := row.(*subforumRow).Subforum
		node := sfTreeMap[cat.ID]
		if node.Parent != nil {
			node.Parent.Children = append(node.Parent.Children, node)
		}
	}
	return sfTreeMap
}

type SubforumLineageBuilder struct {
	Tree          SubforumTree
	SubforumCache map[int][]*Subforum
	SlugCache     map[int][]string
}

func MakeSubforumLineageBuilder(fullSubforumTree SubforumTree) *SubforumLineageBuilder {
	return &SubforumLineageBuilder{
		Tree:          fullSubforumTree,
		SubforumCache: make(map[int][]*Subforum),
		SlugCache:     make(map[int][]string),
	}
}

func (cl *SubforumLineageBuilder) GetLineage(sfId int) []*Subforum {
	_, ok := cl.SubforumCache[sfId]
	if !ok {
		cl.SubforumCache[sfId] = cl.Tree[sfId].GetLineage()
	}
	return cl.SubforumCache[sfId]
}

func (cl *SubforumLineageBuilder) GetSubforumLineage(sfId int) []*Subforum {
	return cl.GetLineage(sfId)[1:]
}

func (cl *SubforumLineageBuilder) GetLineageSlugs(sfId int) []string {
	_, ok := cl.SlugCache[sfId]
	if !ok {
		lineage := cl.GetLineage(sfId)
		result := make([]string, 0, len(lineage))
		for _, cat := range lineage {
			result = append(result, cat.Slug)
		}
		cl.SlugCache[sfId] = result
	}
	return cl.SlugCache[sfId]
}

func (cl *SubforumLineageBuilder) GetSubforumLineageSlugs(sfId int) []string {
	return cl.GetLineageSlugs(sfId)[1:]
}

func (cl *SubforumLineageBuilder) FindIdBySlug(projectId int, slug string) int {
	for _, node := range cl.Tree {
		if node.Slug == slug && node.ProjectID == projectId {
			return node.ID
		}
	}
	return -1
}