package models

type SkillSupportingFile struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

// Skill 技能模型
type Skill struct {
	BaseModel
	Name            string                 `json:"name" gorm:"not null;size:255;index"`
	Slug            string                 `json:"slug" gorm:"uniqueIndex;not null;size:255"`
	Description     string                 `json:"description" gorm:"type:text"`
	Content         string                 `json:"content" gorm:"type:longtext"`
	Notes           string                 `json:"notes" gorm:"type:text"`
	Status          string                 `json:"status" gorm:"not null;size:20;default:'draft';index"`
	Tags            []string               `json:"tags" gorm:"serializer:json;type:longtext"`
	AnthropicConfig map[string]interface{} `json:"anthropic_config" gorm:"serializer:json;type:longtext"`
	SupportingFiles []SkillSupportingFile  `json:"supporting_files" gorm:"serializer:json;type:longtext"`
	ParentID        *uint                  `json:"parent_id" gorm:"index"`
	SortOrder       int                    `json:"sort_order" gorm:"default:0;index"`
	AuthorID        uint                   `json:"author_id" gorm:"not null;index"`
	ChildCount      int                    `json:"child_count" gorm:"-"`

	Parent   *Skill  `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Children []Skill `json:"children,omitempty" gorm:"foreignKey:ParentID"`
	Author   User    `json:"author,omitempty" gorm:"foreignKey:AuthorID"`
}
